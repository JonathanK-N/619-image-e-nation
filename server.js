const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Nettoie CLOUDINARY_URL AVANT de charger la lib : cloudinary valide la variable
// dès le require et fait crasher l'app si le format est invalide.
if (process.env.CLOUDINARY_URL) {
  const clean = process.env.CLOUDINARY_URL.trim().replace(/^["']|["']$/g, '');
  if (/^cloudinary:\/\//.test(clean)) {
    process.env.CLOUDINARY_URL = clean;
  } else {
    console.warn('⚠️  CLOUDINARY_URL ignoré : doit commencer par "cloudinary://". Repli sur le stockage disque.');
    delete process.env.CLOUDINARY_URL;
  }
}
const cloudinary = require('cloudinary').v2;

const app = express();
app.set('trust proxy', true); // Railway/proxy : req.protocol reflète x-forwarded-proto
const PORT = process.env.PORT || 3000;

// ─── Config (set via environment variables) ───
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin619';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── Persistent storage dirs ───
// IMPORTANT : par défaut les données vivent dans le dépôt, donc un redéploiement
// écrase les modifications (Git). Si un volume Railway est monté, on l'utilise
// AUTOMATIQUEMENT (via RAILWAY_VOLUME_MOUNT_PATH) — aucune config manuelle requise.
// On peut aussi forcer les chemins avec DATA_DIR / UPLOADS_DIR.
const SEED_DIR = path.join(__dirname, 'data');
const VOLUME = process.env.RAILWAY_VOLUME_MOUNT_PATH; // défini par Railway si un volume est attaché
const DATA_DIR = process.env.DATA_DIR || (VOLUME ? path.join(VOLUME, 'store') : SEED_DIR);
const UPLOADS_DIR = process.env.UPLOADS_DIR || (VOLUME ? path.join(VOLUME, 'uploads') : path.join(__dirname, 'uploads'));

// Stockage durable ? (volume monté ou chemins explicites hors du dépôt)
const DATA_PERSISTENT = DATA_DIR !== SEED_DIR;
const UPLOADS_PERSISTENT = UPLOADS_DIR !== path.join(__dirname, 'uploads');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Seed data files onto the (possibly empty) persistent volume on first boot
['content.json', 'bookings.json', 'reviews.json', 'media.json'].forEach((file) => {
  const dest = path.join(DATA_DIR, file);
  if (fs.existsSync(dest)) return;
  const seed = path.join(SEED_DIR, file);
  const fallback = file === 'content.json' ? '{}' : '[]';
  fs.writeFileSync(dest, fs.existsSync(seed) ? fs.readFileSync(seed) : fallback);
});

// ─── Helpers ───
const readJSON = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
const writeJSON = (file, data) => fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));

// ─── Cloudinary (primary durable storage — used when configured) ───
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({ secure: true }); // reads CLOUDINARY_URL automatically
} else if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}
const USE_CLOUDINARY = Boolean(process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME);
const CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'image-e-nation';

// ─── Upload config (memory storage → route to Cloudinary or disk) ───
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: CLOUDINARY_FOLDER, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

// ─── Middleware ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname), { maxAge: '1d', etag: true }));

// Simple auth middleware
function authAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (token === generateToken(ADMIN_PASSWORD)) return next();
  res.status(401).json({ error: 'Non autorisé' });
}

function generateToken(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// URL publique fiable pour les liens Telegram : préfère BASE_URL s'il est valide,
// sinon la déduit de la requête (fonctionne sur Railway sans config).
function baseUrl(req) {
  const env = (BASE_URL || '').replace(/\/$/, '');
  if (env && !/localhost|127\.0\.0\.1/.test(env)) return env;
  return `${req.protocol}://${req.get('host')}`;
}

// ─── Telegram Bot ───
const TELEGRAM_ENABLED =
  TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_TOKEN !== 'YOUR_BOT_TOKEN' &&
  TELEGRAM_CHAT_ID && TELEGRAM_CHAT_ID !== 'YOUR_CHAT_ID';

async function sendTelegram(text, inlineKeyboard = null) {
  if (!TELEGRAM_ENABLED) {
    console.warn('⚠️  Telegram non configuré (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID) — notification ignorée.');
    return { ok: false, reason: 'not_configured' };
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' };
  if (inlineKeyboard) body.reply_markup = JSON.stringify({ inline_keyboard: inlineKeyboard });
  try {
    const resp = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (!data.ok) console.error('Telegram API a répondu:', JSON.stringify(data));
    return data;
  } catch (e) {
    console.error('Telegram error:', e.message);
    return { ok: false, reason: e.message };
  }
}

// ─── AUTH ───
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: generateToken(password) });
  } else {
    res.status(401).json({ error: 'Mot de passe incorrect' });
  }
});

// Vérifie qu'un jeton est encore valide (endpoint authentifié, contrairement à /api/content)
app.get('/api/admin/verify', authAdmin, (req, res) => {
  // Le contenu (galerie) est-il durable ? OK si volume/chemin persistant OU si les
  // images vont sur Cloudinary ET les données sur un volume.
  res.json({
    ok: true,
    telegram: TELEGRAM_ENABLED,
    storage: {
      cloudinary: USE_CLOUDINARY,
      dataPersistent: DATA_PERSISTENT,
      uploadsPersistent: UPLOADS_PERSISTENT || USE_CLOUDINARY,
      // Une galerie survit au redéploiement seulement si content.json est persistant
      durable: DATA_PERSISTENT && (USE_CLOUDINARY || UPLOADS_PERSISTENT)
    }
  });
});

// ─── CONTENT API ───
app.get('/api/content', (req, res) => {
  res.json(readJSON('content.json'));
});

app.put('/api/content', authAdmin, (req, res) => {
  writeJSON('content.json', req.body);
  res.json({ success: true });
});

// ─── BOOKINGS API ───
app.post('/api/bookings', async (req, res) => {
  const bookings = readJSON('bookings.json');
  const booking = {
    id: crypto.randomUUID(),
    ...req.body,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  bookings.push(booking);
  writeJSON('bookings.json', bookings);

  // Notify admin via Telegram
  const text = `📸 <b>Nouveau Rendez-vous!</b>\n\n` +
    `👤 <b>Nom:</b> ${booking.name}\n` +
    `📧 <b>Email:</b> ${booking.email}\n` +
    `📱 <b>Tél:</b> ${booking.phone || 'Non fourni'}\n` +
    `🎯 <b>Type:</b> ${booking.event_type || 'Non spécifié'}\n` +
    `💬 <b>Message:</b> ${booking.message}\n` +
    `📅 <b>Date demande:</b> ${new Date(booking.createdAt).toLocaleString('fr-CA')}`;

  const base = baseUrl(req);
  await sendTelegram(text, [
    [
      { text: '✅ Confirmer', url: `${base}/admin/booking-action?id=${booking.id}&action=confirm` },
      { text: '❌ Annuler', url: `${base}/admin/booking-action?id=${booking.id}&action=cancel` }
    ]
  ]);

  res.json({ success: true, id: booking.id });
});

app.get('/api/bookings', authAdmin, (req, res) => {
  res.json(readJSON('bookings.json'));
});

// Détail d'une réservation par ID (UUID non devinable) — public, pour la page
// d'action ouverte depuis Telegram qui n'a pas de jeton admin.
app.get('/api/bookings/:id', (req, res) => {
  const booking = readJSON('bookings.json').find(b => b.id === req.params.id);
  if (!booking) return res.status(404).json({ error: 'Rendez-vous non trouvé' });
  const { name, email, phone, event_type, message, status, createdAt } = booking;
  res.json({ name, email, phone, event_type, message, status, createdAt });
});

// ─── BOOKING ACTION PAGE (from Telegram) ───
app.get('/admin/booking-action', (req, res) => {
  const { id, action } = req.query;
  res.sendFile(path.join(__dirname, 'admin', 'booking-action.html'));
});

app.post('/api/bookings/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action, method } = req.body; // action: confirm|cancel, method: email|whatsapp
  const bookings = readJSON('bookings.json');
  const booking = bookings.find(b => b.id === id);
  if (!booking) return res.status(404).json({ error: 'Rendez-vous non trouvé' });

  booking.status = action === 'confirm' ? 'confirmed' : 'cancelled';
  booking.notifyMethod = method;
  writeJSON('bookings.json', bookings);

  const statusText = action === 'confirm' ? '✅ Confirmé' : '❌ Annulé';
  const methodText = method === 'email' ? 'par Email' : 'par WhatsApp';

  await sendTelegram(
    `${statusText} — Rendez-vous de <b>${booking.name}</b> ${methodText}\n` +
    `📧 ${booking.email} | 📱 ${booking.phone || 'N/A'}`
  );

  res.json({ success: true, status: booking.status });
});

// ─── POST-SESSION: Ask for review (admin triggers) ───
app.post('/api/bookings/:id/request-review', authAdmin, async (req, res) => {
  const { id } = req.params;
  const bookings = readJSON('bookings.json');
  const booking = bookings.find(b => b.id === id);
  if (!booking) return res.status(404).json({ error: 'Non trouvé' });

  const reviewLink = `${baseUrl(req)}/leave-review.html?bookingId=${id}&name=${encodeURIComponent(booking.name)}`;

  await sendTelegram(
    `🎬 <b>Séance terminée!</b>\n\n` +
    `👤 ${booking.name}\n📧 ${booking.email}\n📱 ${booking.phone || 'N/A'}\n\n` +
    `Lien avis: ${reviewLink}`,
    [[{ text: '📝 Demander un avis', url: reviewLink }]]
  );

  res.json({ success: true });
});

// ─── REVIEWS API ───
app.get('/api/reviews', (req, res) => {
  const reviews = readJSON('reviews.json');
  const approved = req.query.all ? reviews : reviews.filter(r => r.approved);
  res.json(approved);
});

app.post('/api/reviews', async (req, res) => {
  const reviews = readJSON('reviews.json');
  const review = {
    id: crypto.randomUUID(),
    ...req.body,
    approved: false,
    createdAt: new Date().toISOString()
  };
  reviews.push(review);
  writeJSON('reviews.json', reviews);

  // Notify admin
  const stars = '⭐'.repeat(review.rating || 5);
  await sendTelegram(
    `📝 <b>Nouvel Avis!</b>\n\n` +
    `👤 <b>${review.name}</b>\n` +
    `${stars}\n` +
    `💬 "${review.message}"\n\n` +
    `🎯 Type: ${review.role || 'Client'}`,
    [[
      { text: '✅ Approuver', url: `${baseUrl(req)}/admin/review-action?id=${review.id}&action=approve` },
      { text: '❌ Rejeter', url: `${baseUrl(req)}/admin/review-action?id=${review.id}&action=reject` }
    ]]
  );

  res.json({ success: true });
});

app.get('/admin/review-action', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'review-action.html'));
});

app.post('/api/reviews/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const reviews = readJSON('reviews.json');
  const review = reviews.find(r => r.id === id);
  if (!review) return res.status(404).json({ error: 'Avis non trouvé' });

  if (action === 'approve') {
    review.approved = true;
  } else {
    reviews.splice(reviews.indexOf(review), 1);
  }
  writeJSON('reviews.json', reviews);

  const statusText = action === 'approve' ? '✅ Approuvé' : '🗑️ Rejeté';
  await sendTelegram(`${statusText} — Avis de <b>${review.name}</b>`);

  res.json({ success: true });
});

// ─── UPLOAD API ───
// media.json = unified index of uploaded photos across providers (cloudinary | local)
const readMedia = () => { try { return readJSON('media.json'); } catch { return []; } };

app.post('/api/upload', authAdmin, upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
  try {
    const media = readMedia();
    let entry;

    if (USE_CLOUDINARY) {
      const result = await uploadToCloudinary(req.file.buffer);
      entry = {
        id: result.public_id,
        url: result.secure_url,
        provider: 'cloudinary',
        publicId: result.public_id,
        createdAt: new Date().toISOString()
      };
    } else {
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);
      entry = {
        id: filename,
        url: `/uploads/${filename}`,
        provider: 'local',
        filename,
        createdAt: new Date().toISOString()
      };
    }

    media.push(entry);
    writeJSON('media.json', media);
    res.json({ url: entry.url, id: entry.id, filename: entry.filename || entry.id });
  } catch (e) {
    console.error('Upload error:', e.message);
    res.status(500).json({ error: 'Échec du téléversement' });
  }
});

app.get('/api/uploads', authAdmin, (req, res) => {
  const media = readMedia().slice().reverse();
  res.json(media.map(m => ({ id: m.id, filename: m.filename || m.id, url: m.url, provider: m.provider })));
});

app.delete('/api/uploads/:id', authAdmin, async (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const media = readMedia();
  const entry = media.find(m => m.id === id || m.filename === id);
  try {
    if (entry?.provider === 'cloudinary') {
      await cloudinary.uploader.destroy(entry.publicId);
    } else {
      const filename = entry?.filename || id;
      const filepath = path.join(UPLOADS_DIR, path.basename(filename));
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
    writeJSON('media.json', media.filter(m => m !== entry));
    res.json({ success: true });
  } catch (e) {
    console.error('Delete error:', e.message);
    res.status(500).json({ error: 'Suppression échouée' });
  }
});

// ─── SPA fallback ───
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/leave-review.html', (req, res) => res.sendFile(path.join(__dirname, 'leave-review.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`IMAGE-E-NATION server running on port ${PORT}`);
  console.log(`Admin panel: ${BASE_URL}/admin`);
  console.log(`Stockage photos : ${USE_CLOUDINARY ? 'Cloudinary ✓' : 'disque (' + UPLOADS_DIR + ')'}`);
  console.log(`Données : ${DATA_DIR}${DATA_PERSISTENT ? ' (persistant ✓)' : ''}`);
  if (VOLUME) console.log(`Volume Railway détecté : ${VOLUME}`);
  if (!DATA_PERSISTENT) {
    console.warn('❌ STOCKAGE ÉPHÉMÈRE : les modifications admin (galerie incluse) seront PERDUES au prochain redéploiement.');
    console.warn('   → Attachez un volume Railway (détecté automatiquement) ou définissez DATA_DIR/UPLOADS_DIR, et/ou configurez Cloudinary.');
  } else if (!USE_CLOUDINARY && !UPLOADS_PERSISTENT) {
    console.warn('⚠️  Données persistantes mais photos sur disque éphémère : configurez Cloudinary ou UPLOADS_DIR.');
  }
  if (TELEGRAM_ENABLED) console.log('Telegram : activé ✓');
  else console.warn('⚠️  Telegram : DÉSACTIVÉ — définissez TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID pour recevoir les notifications de RDV.');
  if (/localhost|127\.0\.0\.1/.test(BASE_URL))
    console.warn('ℹ️  BASE_URL non défini (localhost). Les liens Telegram sont déduits automatiquement de la requête — définissez BASE_URL avec votre domaine Railway pour plus de fiabilité.');
});

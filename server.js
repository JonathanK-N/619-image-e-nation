const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Config (set via environment variables) ───
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || 'YOUR_CHAT_ID';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin619';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ─── Helpers ───
const DATA_DIR = path.join(__dirname, 'data');
const readJSON = (file) => JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
const writeJSON = (file, data) => fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));

// ─── Middleware ───
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

// ─── Telegram Bot ───
async function sendTelegram(text, inlineKeyboard = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const body = {
    chat_id: TELEGRAM_CHAT_ID,
    text,
    parse_mode: 'HTML'
  };
  if (inlineKeyboard) {
    body.reply_markup = JSON.stringify({ inline_keyboard: inlineKeyboard });
  }
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return await resp.json();
  } catch (e) {
    console.error('Telegram error:', e.message);
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

  await sendTelegram(text, [
    [
      { text: '✅ Confirmer', url: `${BASE_URL}/admin/booking-action?id=${booking.id}&action=confirm` },
      { text: '❌ Annuler', url: `${BASE_URL}/admin/booking-action?id=${booking.id}&action=cancel` }
    ]
  ]);

  res.json({ success: true, id: booking.id });
});

app.get('/api/bookings', authAdmin, (req, res) => {
  res.json(readJSON('bookings.json'));
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

  const reviewLink = `${BASE_URL}/leave-review.html?bookingId=${id}&name=${encodeURIComponent(booking.name)}`;

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
      { text: '✅ Approuver', url: `${BASE_URL}/admin/review-action?id=${review.id}&action=approve` },
      { text: '❌ Rejeter', url: `${BASE_URL}/admin/review-action?id=${review.id}&action=reject` }
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

// ─── TELEGRAM WEBHOOK (for inline button callbacks) ───
app.post('/api/telegram/webhook', async (req, res) => {
  // Optional: handle callback_query if using callback_data instead of URLs
  res.sendStatus(200);
});

// ─── SPA fallback ───
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/admin/*', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));
app.get('/leave-review.html', (req, res) => res.sendFile(path.join(__dirname, 'leave-review.html')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`IMAGE-E-NATION server running on port ${PORT}`);
  console.log(`Admin panel: ${BASE_URL}/admin`);
});

const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the project root
app.use(express.static(path.join(__dirname), {
  maxAge: '1d',
  etag:   true,
}));

// SPA fallback — always serve index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`IMAGE-E-NATION server running on port ${PORT}`);
});

require('dotenv').config();
const express = require('express');
const { connectMongo } = require('./src/config/db');
const routes = require('./src/routes');

const app = express();
app.use(express.json());
app.use(routes);

app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Server error' } });
});

const port = process.env.PORT || 8080;

connectMongo()
  .then(() => {
    app.listen(port, () => {
      console.log(`Stocky API listening on :${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start', err);
    process.exit(1);
  });

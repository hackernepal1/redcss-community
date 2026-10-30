
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const { read, write } = require('./store');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '..', 'public');

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || true
}));

app.use(express.json({ limit: '20kb' }));

app.use(express.static(publicDir));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100
}));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'REDCSS Community' });
});

app.get('/api/posts', (req, res) => {
  const db = read();
  res.json(db.posts || []);
});

app.get('/api/courses', (req, res) => {
  const db = read();
  res.json(db.courses || []);
});

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      error: 'Name, email and message are required.'
    });
  }

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string' ||
    name.length > 100 ||
    email.length > 160 ||
    message.length > 3000
  ) {
    return res.status(400).json({ error: 'Invalid form data.' });
  }

  const db = read();

  db.messages.push({
    id: Date.now().toString(),
    name: name.trim(),
    email: email.trim(),
    subject: String(subject || '').slice(0, 150),
    message: message.trim(),
    date: new Date().toISOString()
  });

  write(db);

  res.status(201).json({
    message: 'Your message has been received.'
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`REDCSS Community running on port ${PORT}`);
});
    

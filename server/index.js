const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { read, write } = require('./store');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '..', 'public');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use(express.static(publicDir));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Too many login attempts. Try again later.' }
});

function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : '';

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied.' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function makeId() {
  return crypto.randomUUID();
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'REDCSS Community' });
});

// Public APIs
app.get('/api/posts', (req, res) => {
  res.json(read().posts || []);
});

app.get('/api/courses', (req, res) => {
  res.json(read().courses || []);
});

// Contact form
app.post('/api/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof message !== 'string' ||
    !name.trim() ||
    !email.trim() ||
    !message.trim() ||
    name.length > 100 ||
    email.length > 160 ||
    message.length > 3000
  ) {
    return res.status(400).json({ error: 'Invalid contact form data.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const db = read();
  db.messages = db.messages || [];

  db.messages.push({
    id: makeId(),
    name: name.trim(),
    email: email.trim(),
    subject: typeof subject === 'string' ? subject.slice(0, 150) : '',
    message: message.trim(),
    status: 'unread',
    createdAt: new Date().toISOString()
  });

  write(db);

  res.status(201).json({
    message: 'Your message has been received.'
  });
});

// Admin login
app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (!adminUsername || !adminPassword || !jwtSecret || jwtSecret.length < 32) {
    return res.status(503).json({
      error: 'Admin authentication is not configured correctly.'
    });
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid login details.' });
  }

  const usernameBuffer = Buffer.from(username);
  const expectedUsername = Buffer.from(adminUsername);
  const passwordBuffer = Buffer.from(password);
  const expectedPassword = Buffer.from(adminPassword);

  const usernameMatch =
    usernameBuffer.length === expectedUsername.length &&
    crypto.timingSafeEqual(usernameBuffer, expectedUsername);

  const passwordMatch =
    passwordBuffer.length === expectedPassword.length &&
    crypto.timingSafeEqual(passwordBuffer, expectedPassword);

  if (!usernameMatch || !passwordMatch) {
    return res.status(401).json({ error: 'Incorrect username or password.' });
  }

  const token = jwt.sign(
    { role: 'admin' },
    jwtSecret,
    { expiresIn: '2h' }
  );

  res.json({ token });
});

// Protected admin APIs
app.get('/api/admin/messages', authenticateAdmin, (req, res) => {
  const db = read();

  const messages = (db.messages || []).map(m => ({
    ...m,
    status: m.status || 'unread',
    createdAt: m.createdAt || m.date || null
  }));

  res.json(messages);
});

app.patch('/api/admin/messages/:id', authenticateAdmin, (req, res) => {
  const db = read();
  const message = (db.messages || []).find(m => m.id === req.params.id);

  if (!message) {
    return res.status(404).json({ error: 'Message not found.' });
  }

  if (req.body.status !== 'read') {
    return res.status(400).json({ error: 'Invalid message status.' });
  }

  message.status = 'read';
  write(db);

  res.json({ message: 'Message marked as read.' });
});

app.post('/api/admin/posts', authenticateAdmin, (req, res) => {
  const { title, category, excerpt, content } = req.body || {};

  if (
    typeof title !== 'string' ||
    typeof category !== 'string' ||
    typeof excerpt !== 'string' ||
    typeof content !== 'string' ||
    !title.trim() ||
    !content.trim() ||
    title.length > 180 ||
    category.length > 80 ||
    excerpt.length > 500 ||
    content.length > 10000
  ) {
    return res.status(400).json({ error: 'Invalid article details.' });
  }

  const db = read();
  db.posts = db.posts || [];

  const post = {
    id: makeId(),
    title: title.trim(),
    category: category.trim() || 'Community',
    excerpt: excerpt.trim(),
    content: content.trim(),
    date: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: '2-digit'
    })
  };

  db.posts.unshift(post);
  write(db);

  res.status(201).json({
    message: 'Article published.',
    post
  });
});

app.delete('/api/admin/posts/:id', authenticateAdmin, (req, res) => {
  const db = read();
  db.posts = db.posts || [];

  const index = db.posts.findIndex(p => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Article not found.' });
  }

  db.posts.splice(index, 1);
  write(db);

  res.json({ message: 'Article deleted.' });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`REDCSS Community running on port ${PORT}`);
});
    

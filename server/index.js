
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
app.use(express.json({ limit: '50kb' }));

app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100
}));

app.use(express.static(publicDir));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Too many login attempts. Try again later.' }
});

function makeId() {
  return crypto.randomUUID();
}

function authenticateAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : '';

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied.'
      });
    }

    next();
  } catch {
    return res.status(401).json({
      error: 'Invalid or expired token.'
    });
  }
}

function validObject(value) {
  return value &&
    typeof value === 'object' &&
    !Array.isArray(value);
}

function validateResource(data, allowedFields) {
  if (!validObject(data)) return false;

  const keys = Object.keys(data);

  if (!keys.length || keys.length > 30) return false;

  return keys.every(key => {
    if (!allowedFields.includes(key)) return false;

    const value = data[key];

    if (
      typeof value === 'string' &&
      value.length > 5000
    ) return false;

    if (
      Array.isArray(value) &&
      value.length > 100
    ) return false;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) return false;

    return (
      value === null ||
      ['string', 'number', 'boolean'].includes(typeof value) ||
      Array.isArray(value)
    );
  });
}

function cleanResource(data) {
  const clean = {};

  Object.keys(data).forEach(key => {
    clean[key] = data[key];
  });

  return clean;
}

/* HEALTH */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'REDCSS Community'
  });
});

/* PUBLIC CONTENT */

app.get('/api/posts', (req, res) => {
  res.json(read().posts || []);
});

app.get('/api/courses', (req, res) => {
  res.json(read().courses || []);
});

app.get('/api/settings', (req, res) => {
  res.json(read().settings || {});
});

/* PUBLIC WEBSITE COLLECTIONS */

const resources = {
  sections: [
    'title', 'subtitle', 'description', 'content',
    'image', 'imageUrl', 'link', 'buttonText',
    'visible', 'order'
  ],

  products: [
    'title', 'description', 'category', 'price',
    'image', 'imageUrl', 'link', 'buttonText',
    'visible', 'order'
  ],

  services: [
    'title', 'description', 'category',
    'image', 'imageUrl', 'link', 'buttonText',
    'visible', 'order'
  ],

  profiles: [
    'name', 'role', 'bio', 'image',
    'imageUrl', 'website', 'achievements',
    'visible', 'order'
  ],

  labs: [
    'title', 'description', 'difficulty',
    'category', 'instructions', 'link',
    'visible', 'order'
  ],

  banners: [
    'title', 'subtitle', 'description',
    'image', 'imageUrl', 'link',
    'buttonText', 'visible', 'order'
  ]
};

Object.keys(resources).forEach(resource => {
  app.get('/api/' + resource, (req, res) => {
    const db = read();

    const items = Array.isArray(db[resource])
      ? db[resource]
      : [];

    res.json(
      items.filter(item => item.visible !== false)
    );
  });
});

/* CONTACT FORM */

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
    return res.status(400).json({
      error: 'Invalid contact form data.'
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({
      error: 'Invalid email address.'
    });
  }

  const db = read();
  db.messages = db.messages || [];

  db.messages.push({
    id: makeId(),
    name: name.trim(),
    email: email.trim(),
    subject: typeof subject === 'string'
      ? subject.slice(0, 150)
      : '',
    message: message.trim(),
    status: 'unread',
    createdAt: new Date().toISOString()
  });

  write(db);

  res.status(201).json({
    message: 'Your message has been received.'
  });
});

/* ADMIN LOGIN */

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const jwtSecret = process.env.JWT_SECRET;

  if (
    !adminUsername ||
    !adminPassword ||
    !jwtSecret ||
    jwtSecret.length < 32
  ) {
    return res.status(503).json({
      error: 'Admin authentication is not configured correctly.'
    });
  }

  if (
    typeof username !== 'string' ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({
      error: 'Invalid login details.'
    });
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
    return res.status(401).json({
      error: 'Incorrect username or password.'
    });
  }

  const token = jwt.sign(
    { role: 'admin' },
    jwtSecret,
    { expiresIn: '2h' }
  );

  res.json({ token });
});

/* PROTECTED ADMIN APIs */

app.get('/api/admin/messages', authenticateAdmin, (req, res) => {
  const db = read();

  const messages = (db.messages || []).map(message => ({
    ...message,
    status: message.status || 'unread',
    createdAt: message.createdAt || message.date || null
  }));

  res.json(messages);
});

app.patch(
  '/api/admin/messages/:id',
  authenticateAdmin,
  (req, res) => {
    const db = read();

    const message = (db.messages || []).find(
      item => item.id === req.params.id
    );

    if (!message) {
      return res.status(404).json({
        error: 'Message not found.'
      });
    }

    if (req.body.status !== 'read') {
      return res.status(400).json({
        error: 'Invalid message status.'
      });
    }

    message.status = 'read';
    write(db);

    res.json({
      message: 'Message marked as read.'
    });
  }
);

/* ARTICLE MANAGEMENT */

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
    return res.status(400).json({
      error: 'Invalid article details.'
    });
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

app.delete(
  '/api/admin/posts/:id',
  authenticateAdmin,
  (req, res) => {
    const db = read();
    db.posts = db.posts || [];

    const index = db.posts.findIndex(
      post => post.id === req.params.id
    );

    if (index === -1) {
      return res.status(404).json({
        error: 'Article not found.'
      });
    }

    db.posts.splice(index, 1);
    write(db);

    res.json({
      message: 'Article deleted.'
    });
  }
);

/* RESOURCE MANAGEMENT */

Object.keys(resources).forEach(resource => {
  const allowedFields = resources[resource];
  const base = '/api/admin/' + resource;

  // Get all items
  app.get(base, authenticateAdmin, (req, res) => {
    const db = read();
    res.json(Array.isArray(db[resource]) ? db[resource] : []);
  });

  // Add item
  app.post(base, authenticateAdmin, (req, res) => {
    if (!validateResource(req.body, allowedFields)) {
      return res.status(400).json({
        error: 'Invalid ' + resource + ' data.'
      });
    }

    const db = read();
    db[resource] = db[resource] || [];

    const item = {
      ...cleanResource(req.body),
      id: makeId(),
      createdAt: new Date().toISOString()
    };

    db[resource].push(item);
    write(db);

    res.status(201).json({
      message: resource + ' item created.',
      item
    });
  });

  // Edit item
  app.patch(
    base + '/:id',
    authenticateAdmin,
    (req, res) => {
      if (!validateResource(req.body, allowedFields)) {
        return res.status(400).json({
          error: 'Invalid ' + resource + ' data.'
        });
      }

      const db = read();
      db[resource] = db[resource] || [];

      const item = db[resource].find(
        entry => entry.id === req.params.id
      );

      if (!item) {
        return res.status(404).json({
          error: 'Item not found.'
        });
      }

      Object.assign(item, cleanResource(req.body));
      write(db);

      res.json({
        message: resource + ' item updated.',
        item
      });
    }
  );

  // Delete item
  app.delete(
    base + '/:id',
    authenticateAdmin,
    (req, res) => {
      const db = read();
      db[resource] = db[resource] || [];

      const index = db[resource].findIndex(
        entry => entry.id === req.params.id
      );

      if (index === -1) {
        return res.status(404).json({
          error: 'Item not found.'
        });
      }

      db[resource].splice(index, 1);
      write(db);

      res.json({
        message: resource + ' item deleted.'
      });
    }
  );
});

/* COURSE MANAGEMENT */

app.get('/api/admin/courses', authenticateAdmin, (req, res) => {
  res.json(read().courses || []);
});

app.post('/api/admin/courses', authenticateAdmin, (req, res) => {
  const { title, duration, description, modules, type, active } =
    req.body || {};

  if (
    typeof title !== 'string' ||
    !title.trim() ||
    title.length > 180 ||
    typeof duration !== 'string' ||
    duration.length > 100 ||
    typeof description !== 'string' ||
    description.length > 2000 ||
    !Array.isArray(modules) ||
    modules.length > 50 ||
    !modules.every(
      item => typeof item === 'string' && item.length <= 300
    ) ||
    !['free', 'paid'].includes(type)
  ) {
    return res.status(400).json({
      error: 'Invalid course details.'
    });
  }

  const db = read();
  db.courses = db.courses || [];

  const course = {
    id: makeId(),
    title: title.trim(),
    duration,
    description,
    modules,
    type,
    active: active !== false
  };

  db.courses.push(course);
  write(db);

  res.status(201).json({
    message: 'Course created.',
    course
  });
});

app.patch(
  '/api/admin/courses/:id',
  authenticateAdmin,
  (req, res) => {
    const allowed = [
      'title', 'duration', 'description',
      'modules', 'type', 'active'
    ];

    if (
      !validObject(req.body) ||
      !Object.keys(req.body).length ||
      Object.keys(req.body).some(key => !allowed.includes(key))
    ) {
      return res.status(400).json({
        error: 'Invalid course update.'
      });
    }

    const db = read();
    db.courses = db.courses || [];

    const course = db.courses.find(
      item => item.id === req.params.id
    );

    if (!course) {
      return res.status(404).json({
        error: 'Course not found.'
      });
    }

    Object.assign(course, req.body);
    write(db);

    res.json({
      message: 'Course updated.',
      course
    });
  }
);

app.delete(
  '/api/admin/courses/:id',
  authenticateAdmin,
  (req, res) => {
    const db = read();
    db.courses = db.courses || [];

    const index = db.courses.findIndex(
      item => item.id === req.params.id
    );

    if (index === -1) {
      return res.status(404).json({
        error: 'Course not found.'
      });
    }

    db.courses.splice(index, 1);
    write(db);

    res.json({
      message: 'Course deleted.'
    });
  }
);

/* WEBSITE SETTINGS */

app.patch(
  '/api/admin/settings',
  authenticateAdmin,
  (req, res) => {
    if (!validObject(req.body)) {
      return res.status(400).json({
        error: 'Invalid settings.'
      });
    }

    const allowed = [
      'siteName', 'tagline', 'logo',
      'email', 'phone', 'address',
      'facebook', 'instagram', 'youtube',
      'linkedin', 'announcement',
      'maintenanceMode'
    ];

    const keys = Object.keys(req.body);

    if (
      !keys.length ||
      keys.some(key => !allowed.includes(key)) ||
      keys.some(key => {
        const value = req.body[key];

        return !(
          typeof value === 'string' ||
          typeof value === 'boolean'
        ) || (
          typeof value === 'string' &&
          value.length > 1000
        );
      })
    ) {
      return res.status(400).json({
        error: 'Unsupported settings field or value.'
      });
    }

    const db = read();
    db.settings = db.settings || {};

    Object.assign(db.settings, req.body);
    write(db);

    res.json({
      message: 'Website settings updated.',
      settings: db.settings
    });
  }
);

/* HOME */

app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

/* ERROR HANDLER */

app.use((error, req, res, next) => {
  console.error(error);

  res.status(500).json({
    error: 'Internal server error.'
  });
});

/* START SERVER */

app.listen(PORT, '0.0.0.0', () => {
  console.log(
    `REDCSS Community running on port ${PORT}`
  );
});
      

/* =========================================================
   REDCSS COMMUNITY - ADMIN PANEL
   Preserves login, dashboard, articles and messages.
   Adds management for courses, products, services, profiles,
   labs, sections, banners and site settings.
   ========================================================= */

(() => {
  'use strict';

  let token = '';
  let messages = [];
  let posts = [];
  let currentView = 'overview';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const byId = id => document.getElementById(id);
  const setText = (id, value) => {
    const el = byId(id);
    if (el) el.textContent = value == null ? '' : String(value);
  };
  const show = (el, visible = true) => {
    if (el) el.hidden = !visible;
  };
  const escapeText = value => String(value ?? '');

  async function api(url, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(url, { ...options, headers });
    const raw = await response.text();
    let result = {};
    try { result = raw ? JSON.parse(raw) : {}; }
    catch { result = { error: raw || 'Invalid server response.' }; }

    if (!response.ok) {
      if ((response.status === 401 || response.status === 403) && token) {
        logout(false);
      }
      throw new Error(result.error || result.message || `Request failed (${response.status})`);
    }
    return result;
  }

  function setStatus(id, message, isError = false) {
    const el = byId(id);
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('error', !!isError);
    el.classList.toggle('success', !isError && !!message);
  }

  function showView(view) {
    currentView = view;
    $$('.view, [data-view-panel]').forEach(panel => {
      const panelView = panel.dataset.viewPanel || panel.id?.replace(/^view-/, '');
      if (panelView) panel.hidden = panelView !== view;
    });

    $$('.nav-item, [data-view]').forEach(item => {
      const itemView = item.dataset.view || item.dataset.target;
      if (itemView) item.classList.toggle('active', itemView === view);
    });

    const heading = byId('pageTitle');
    if (heading) {
      const active = $(`[data-view="${view}"]`);
      heading.textContent = active ? active.textContent.trim() : view.charAt(0).toUpperCase() + view.slice(1);
    }

    if (view === 'overview' || view === 'analytics' || view === 'messages' ||
        view === 'articles' || view === 'system') {
      refreshDashboard().catch(err => console.error(err));
    }
    if (['courses', 'products', 'services', 'community', 'labs', 'sections', 'banners'].includes(view)) {
      const key = view === 'community' ? 'profiles' : view;
      loadCollection(key).catch(err => console.error(err));
    }
    if (view === 'settings') loadSettings().catch(err => setStatus('settingsStatus', err.message, true));
  }

  function logout(showLogin = true) {
    token = '';
    messages = [];
    posts = [];
    const app = byId('adminApp');
    const login = byId('loginPanel');
    show(app, false);
    if (showLogin) show(login, true);
    setStatus('loginStatus', '');
  }

  async function login(event) {
    event.preventDefault();
    const username = byId('username')?.value?.trim() || '';
    const password = byId('password')?.value || '';
    const button = byId('loginBtn');
    if (button) {
      button.disabled = true;
      button.textContent = 'Signing in…';
    }
    setStatus('loginStatus', '');

    try {
      const result = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      token = result.token || result.accessToken || '';
      if (!token) throw new Error('Login response did not include an access token.');

      show(byId('loginPanel'), false);
      show(byId('adminApp'), true);
      showView('overview');
      await refreshDashboard();
    } catch (error) {
      setStatus('loginStatus', error.message || 'Login failed.', true);
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Login';
      }
    }
  }

  async function refreshDashboard() {
    if (!token) return;

    const healthPromise = api('/api/health').catch(() => ({ status: 'offline' }));
    const messagesPromise = api('/api/admin/messages').catch(() => ({ messages: [] }));
    const postsPromise = api('/api/posts').catch(() => ({ posts: [] }));

    const [health, messageData, postData] = await Promise.all([
      healthPromise, messagesPromise, postsPromise
    ]);

    messages = Array.isArray(messageData) ? messageData : (messageData.messages || []);
    posts = Array.isArray(postData) ? postData : (postData.posts || []);

    const unread = messages.filter(m => !m.read).length;
    setText('statPosts', posts.length);
    setText('statMessages', messages.length);
    setText('statUnread', unread);
    setText('navUnread', unread);
    setText('statStatus', health.status === 'offline' ? 'Offline' : 'Online');
    setText('systemApi', health.status === 'offline' ? 'Unavailable' : 'Operational');
    setText('systemWebsite', 'Connected');
    setText('systemInfo', health.message || health.status || 'API health check completed.');

    renderMessages();
    renderPosts();
    renderActivity();
  }

  function renderActivity() {
    const list = byId('activityList') || byId('recentActivity');
    if (!list) return;
    list.replaceChildren();

    const entries = [
      ...messages.slice(0, 5).map(item => ({
        label: `New message: ${item.name || item.email || 'Visitor'}`,
        date: item.createdAt || item.date || ''
      })),
      ...posts.slice(0, 5).map(item => ({
        label: `Article available: ${item.title || 'Untitled'}`,
        date: item.date || item.createdAt || ''
      }))
    ].slice(0, 8);

    if (!entries.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No recent activity yet.';
      list.append(empty);
      return;
    }

    entries.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'activity-item';
      const title = document.createElement('span');
      title.textContent = entry.label;
      const date = document.createElement('small');
      date.textContent = entry.date;
      row.append(title, date);
      list.append(row);
    });
  }

  function renderMessages() {
    const list = byId('messagesList');
    if (!list) return;
    list.replaceChildren();

    if (!messages.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No messages received yet.';
      list.append(empty);
      return;
    }

    messages.forEach(message => {
      const card = document.createElement('article');
      card.className = 'admin-item';
      const title = document.createElement('h3');
      title.textContent = message.subject || `Message from ${message.name || 'Visitor'}`;
      const detail = document.createElement('p');
      detail.textContent = `${message.name || 'Unknown'} · ${message.email || ''}`;
      const body = document.createElement('p');
      body.textContent = message.message || '';
      const meta = document.createElement('small');
      meta.textContent = `${message.createdAt || message.date || ''}${message.read ? ' · Read' : ' · Unread'}`;
      card.append(title, detail, body, meta);

      if (!message.read && message.id) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Mark as read';
        button.addEventListener('click', async () => {
          try {
            await api(`/api/admin/messages/${encodeURIComponent(message.id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ read: true })
            });
            await refreshDashboard();
          } catch (error) {
            alert(error.message);
          }
        });
        card.append(button);
      }
      list.append(card);
    });
  }

  function renderPosts() {
    const list = byId('postsList');
    if (!list) return;
    list.replaceChildren();

    if (!posts.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'No articles yet.';
      list.append(empty);
      return;
    }

    posts.forEach(post => {
      const card = document.createElement('article');
      card.className = 'admin-item';
      const title = document.createElement('h3');
      title.textContent = post.title || 'Untitled article';
      const desc = document.createElement('p');
      desc.textContent = post.excerpt || post.category || '';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Delete';
      button.addEventListener('click', async () => {
        if (!confirm(`Delete "${post.title || 'this article'}"?`)) return;
        try {
          await api(`/api/admin/posts/${encodeURIComponent(post.id)}`, { method: 'DELETE' });
          await refreshDashboard();
        } catch (error) {
          alert(error.message);
        }
      });
      card.append(title, desc, button);
      list.append(card);
    });
  }

  function formObject(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (key === 'visible' || key === 'active') return;
      if (typeof value === 'string' && value.trim() !== '') data[key] = value.trim();
    });
    return data;
  }

  const collections = {
    sections: { formId: 'sectionForm', listId: 'sectionsList', endpoint: '/api/admin/sections', publicEndpoint: '/api/sections' },
    products: { formId: 'productForm', listId: 'productsList', endpoint: '/api/admin/products', publicEndpoint: '/api/products' },
    services: { formId: 'serviceForm', listId: 'servicesList', endpoint: '/api/admin/services', publicEndpoint: '/api/services' },
    profiles: { formId: 'profileForm', listId: 'profilesList', endpoint: '/api/admin/profiles', publicEndpoint: '/api/profiles' },
    labs: { formId: 'labForm', listId: 'labsList', endpoint: '/api/admin/labs', publicEndpoint: '/api/labs' },
    banners: { formId: 'bannerForm', listId: 'bannersList', endpoint: '/api/admin/banners', publicEndpoint: '/api/banners' }
  };

  function addFieldLine(parent, label, value) {
    const line = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    const span = document.createElement('span');
    span.textContent = escapeText(value || '—');
    line.append(strong, span);
    parent.append(line);
  }

  async function loadCollection(key) {
    const config = collections[key];
    if (!config) return;
    const list = byId(config.listId);
    if (!list) return;

    try {
      const result = await api(config.publicEndpoint);
      const items = Array.isArray(result) ? result : (result[key] || result.items || []);
      list.replaceChildren();

      if (!items.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = `No ${key} added yet.`;
        list.append(empty);
        return;
      }

      items.forEach(item => {
        const card = document.createElement('article');
        card.className = 'admin-item';
        const title = document.createElement('h3');
        title.textContent = item.title || item.name || 'Untitled';
        card.append(title);
        addFieldLine(card, 'Status', item.visible === false ? 'Hidden' : 'Visible');
        addFieldLine(card, 'Description', item.description || item.bio || item.subtitle || '');
        if (item.price) addFieldLine(card, 'Price', item.price);
        if (item.category) addFieldLine(card, 'Category', item.category);

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.textContent = item.visible === false ? 'Make visible' : 'Hide';
        toggle.addEventListener('click', async () => {
          try {
            await api(`${config.endpoint}/${encodeURIComponent(item.id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ visible: item.visible === false })
            });
            await loadCollection(key);
          } catch (error) {
            alert(error.message);
          }
        });

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = 'Delete';
        remove.addEventListener('click', async () => {
          if (!confirm(`Delete "${item.title || item.name || 'this item'}"?`)) return;
          try {
            await api(`${config.endpoint}/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
            await loadCollection(key);
          } catch (error) {
            alert(error.message);
          }
        });
        card.append(toggle, remove);
        list.append(card);
      });
    } catch (error) {
      list.replaceChildren();
      const message = document.createElement('p');
      message.className = 'error';
      message.textContent = error.message;
      list.append(message);
    }
  }

  function bindCollectionForm(key) {
    const config = collections[key];
    const form = byId(config.formId);
    if (!form) return;

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = formObject(form);
      const visibleInput = form.querySelector('[name="visible"]');
      data.visible = visibleInput ? visibleInput.checked : true;
      const orderInput = form.querySelector('[name="order"]');
      if (orderInput && orderInput.value.trim() !== '') data.order = Number(orderInput.value);

      const statusId = `${key === 'profiles' ? 'profile' : key.slice(0, -1)}Status`;
      setStatus(statusId, 'Saving…');
      try {
        await api(config.endpoint, { method: 'POST', body: JSON.stringify(data) });
        form.reset();
        setStatus(statusId, 'Saved successfully.');
        await loadCollection(key);
      } catch (error) {
        setStatus(statusId, error.message, true);
      }
    });
  }

  async function loadCourses() {
    const list = byId('coursesList');
    if (!list) return;
    try {
      const result = await api('/api/courses');
      const courses = (Array.isArray(result) ? result : (result.courses || [])).filter(c => c.active !== false);
      list.replaceChildren();
      if (!courses.length) {
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = 'No active courses yet.';
        list.append(empty);
        return;
      }
      courses.forEach(course => {
        const card = document.createElement('article');
        card.className = 'admin-item';
        const title = document.createElement('h3');
        title.textContent = course.title || 'Untitled course';
        const info = document.createElement('p');
        info.textContent = `${course.type || 'course'} · ${course.duration || ''}`;
        const desc = document.createElement('p');
        desc.textContent = course.description || '';
        const del = document.createElement('button');
        del.type = 'button';
        del.textContent = 'Delete';
        del.addEventListener('click', async () => {
          if (!confirm(`Delete "${course.title || 'this course'}"?`)) return;
          try {
            await api(`/api/admin/courses/${encodeURIComponent(course.id)}`, { method: 'DELETE' });
            await loadCourses();
          } catch (error) { alert(error.message); }
        });
        card.append(title, info, desc, del);
        list.append(card);
      });
    } catch (error) {
      list.textContent = error.message;
    }
  }

  function bindCourseForm() {
    const form = byId('courseForm');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = formObject(form);
      const modules = form.querySelector('[name="modules"]')?.value || '';
      data.modules = modules.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      data.type = form.querySelector('[name="type"]')?.value || 'free';
      data.active = form.querySelector('[name="active"]')?.checked ?? true;
      const status = 'courseStatus';
      setStatus(status, 'Saving…');
      try {
        await api('/api/admin/courses', { method: 'POST', body: JSON.stringify(data) });
        form.reset();
        setStatus(status, 'Course saved successfully.');
        await loadCourses();
      } catch (error) {
        setStatus(status, error.message, true);
      }
    });
  }

  async function loadSettings() {
    const form = byId('settingsForm');
    if (!form) return;
    const result = await api('/api/settings');
    const settings = result.settings || result;
    Object.entries(settings).forEach(([key, value]) => {
      const field = form.elements.namedItem(key);
      if (field && typeof value !== 'object') field.value = value ?? '';
    });
  }

  function bindSettingsForm() {
    const form = byId('settingsForm');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = formObject(form);
      setStatus('settingsStatus', 'Saving settings…');
      try {
        await api('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(data) });
        setStatus('settingsStatus', 'Settings saved successfully.');
      } catch (error) {
        setStatus('settingsStatus', error.message, true);
      }
    });
  }

  function bindArticleForm() {
    const form = byId('postForm');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = formObject(form);
      setStatus('postStatus', 'Publishing…');
      try {
        await api('/api/admin/posts', { method: 'POST', body: JSON.stringify(data) });
        form.reset();
        setStatus('postStatus', 'Article published successfully.');
        await refreshDashboard();
      } catch (error) {
        setStatus('postStatus', error.message, true);
      }
    });
  }

  function bindNavigation() {
    $$('[data-view]').forEach(button => {
      button.addEventListener('click', () => showView(button.dataset.view));
    });

    // Compatibility with older admin.html navigation markup.
    $$('.nav-item').forEach(button => {
      if (button.dataset.view) return;
      button.addEventListener('click', () => {
        const view = button.dataset.target || button.getAttribute('href')?.replace('#', '');
        if (view) showView(view);
      });
    });

    const refresh = byId('refreshBtn') || byId('refreshDashboard');
    refresh?.addEventListener('click', () => refreshDashboard().catch(err => alert(err.message)));
    byId('logoutBtn')?.addEventListener('click', () => logout(true));
  }

  function init() {
    byId('loginForm')?.addEventListener('submit', login);
    bindNavigation();
    bindArticleForm();
    Object.keys(collections).forEach(bindCollectionForm);
    bindCourseForm();
    bindSettingsForm();

    // Load the login screen by default; admin token stays in memory only.
    show(byId('adminApp'), false);
    show(byId('loginPanel'), true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

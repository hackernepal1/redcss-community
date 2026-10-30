/* ==========================================
   REDCSS COMMUNITY
   ADMIN CONTROL CENTER
========================================== */

let token = "";

const $ = id => document.getElementById(id);

const state = {
  messages: [],
  posts: [],
  currentView: "overview"
};

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = value;
}

function createNode(tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  return element;
}

/* API CONNECTION */

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      logout();
    }
    throw new Error(data.error || "Request failed");
  }

  return data;
}

/* NAVIGATION */

function showView(view) {
  const validViews = [
    "overview",
    "analytics",
    "messages",
    "articles",
    "create",
    "system",
    "security"
  ];

  if (!validViews.includes(view)) return;

  state.currentView = view;

  document.querySelectorAll(".admin-view").forEach(section => {
    section.hidden = section.id !== view + "View";
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const titles = {
    overview: "Overview",
    analytics: "Analytics",
    messages: "Messages",
    articles: "Articles",
    create: "Create Article",
    system: "System Monitor",
    security: "Security Center"
  };

  setText("pageTitle", titles[view]);

  if (view === "messages") renderMessages();
  if (view === "articles") renderPosts();
}

/* LOGIN */

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const button = $("loginBtn");
  button.disabled = true;
  button.textContent = "Signing in...";

  setText("loginStatus", "");

  try {
    const result = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        username: $("username").value.trim(),
        password: $("password").value
      })
    });

    token = result.token;

    if (!token) throw new Error("Login token not received.");

    $("loginPanel").hidden = true;
    $("adminApp").hidden = false;

    showView("overview");

    await refreshDashboard();

  } catch (error) {
    setText("loginStatus", error.message);
  } finally {
    button.disabled = false;
    button.textContent = "Sign in to Dashboard ↗";
  }
});

/* LOGOUT */

function logout() {
  token = "";
  state.messages = [];
  state.posts = [];

  $("adminApp").hidden = true;
  $("loginPanel").hidden = false;
  $("password").value = "";

  setText("loginStatus", "You have signed out.");
}

$("logoutBtn").addEventListener("click", logout);

/* LOAD DATA */

async function refreshDashboard() {
  setText("statStatus", "Loading");
  setText("activityList", "Loading recent activity...");

  try {
    const [messages, posts, health] = await Promise.all([
      api("/api/admin/messages"),
      api("/api/posts"),
      fetch("/api/health").then(response => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json();
      })
    ]);

    state.messages = Array.isArray(messages) ? messages : [];
    state.posts = Array.isArray(posts) ? posts : [];

    const unread = state.messages.filter(
      message => message.status !== "read"
    ).length;

    setText("statPosts", state.posts.length);
    setText("statMessages", state.messages.length);
    setText("statUnread", unread);
    setText("statStatus", health.status === "ok" ? "Online" : "Check");

    setText("navUnread", unread);

    setText(
      "systemApi",
      health.status === "ok" ? "Online" : "Check"
    );

    setText("systemWebsite", "Connected");
    setText("systemInfo", "Service: " + (health.service || "REDCSS Community"));

    renderActivity();
    renderMessages();
    renderPosts();

    setText("pageViews", "Not tracked");
    setText("uniqueVisitors", "Not tracked");
    setText("apiRequests", "Not tracked");
    setText("serverUptime", "Not tracked");

    setText(
      "trafficChart",
      "Visitor analytics will appear here after tracking is configured."
    );

  } catch (error) {
    setText("statStatus", "Error");
    setText("activityList", error.message);
    setText("systemInfo", error.message);
  }
}

/* RECENT ACTIVITY */

function renderActivity() {
  const container = $("activityList");
  container.replaceChildren();

  const items = [
    ...state.posts.map(post => ({
      label: "Article published",
      detail: post.title || "Untitled article",
      date: post.createdAt || post.date
    })),
    ...state.messages.map(message => ({
      label: "New contact message",
      detail: message.name || "Visitor",
      date: message.createdAt || message.date
    }))
  ].sort((a, b) => {
    return new Date(b.date || 0) - new Date(a.date || 0);
  }).slice(0, 8);

  if (!items.length) {
    container.className = "admin-empty";
    container.textContent = "No recent activity yet.";
    return;
  }

  container.className = "";

  items.forEach(item => {
    const row = document.createElement("div");
    row.style.cssText =
      "padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)";

    row.append(
      createNode("strong", item.label),
      createNode("p", item.detail)
    );

    if (item.date) {
      row.append(
        createNode("small", new Date(item.date).toLocaleString())
      );
    }

    container.append(row);
  });
}

/* MESSAGES */

function renderMessages() {
  const container = $("messagesList");
  container.replaceChildren();

  if (!state.messages.length) {
    container.append(
      createNode("div", "No messages received yet.", "admin-empty")
    );
    return;
  }

  state.messages.forEach(message => {
    const card = document.createElement("div");
    card.className = "admin-panel";

    card.append(
      createNode("h3", message.name || "Unknown sender"),
      createNode("p", "Email: " + (message.email || "Not provided")),
      createNode("p", "Subject: " + (message.subject || "No subject")),
      createNode("p", message.message || ""),
      createNode(
        "small",
        "Status: " + (message.status || "unread")
      )
    );

    const date = message.createdAt || message.date;

    if (date) {
      card.append(
        createNode("p", new Date(date).toLocaleString())
      );
    }

    if (message.status !== "read") {
      const button = createNode(
        "button",
        "✓ Mark as read",
        "admin-action-btn"
      );

      button.addEventListener("click", async () => {
        button.disabled = true;

        try {
          await api("/api/admin/messages/" + encodeURIComponent(message.id), {
            method: "PATCH",
            body: JSON.stringify({ status: "read" })
          });

          await refreshDashboard();
        } catch (error) {
          alert(error.message);
          button.disabled = false;
        }
      });

      card.append(button);
    }

    container.append(card);
  });
}

/* ARTICLES */

function renderPosts() {
  const container = $("postsList");
  container.replaceChildren();

  if (!state.posts.length) {
    container.append(
      createNode("div", "No articles published yet.", "admin-empty")
    );
    return;
  }

  state.posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "admin-panel";

    card.append(
      createNode("h3", post.title || "Untitled article"),
      createNode("p", post.category || "General")
    );

    if (post.excerpt) {
      card.append(createNode("p", post.excerpt));
    }

    const button = createNode(
      "button",
      "Delete Article",
      "admin-action-btn"
    );

    button.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to delete this article?")) {
        return;
      }

      button.disabled = true;

      try {
        await api("/api/admin/posts/" + encodeURIComponent(post.id), {
          method: "DELETE"
        });

        await refreshDashboard();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    });

    card.append(button);
    container.append(card);
  });
}

/* CREATE ARTICLE */

$("postForm").addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('button[type="submit"]');

  button.disabled = true;
  setText("postStatus", "Publishing article...");

  const data = Object.fromEntries(new FormData(form));

  try {
    await api("/api/admin/posts", {
      method: "POST",
      body: JSON.stringify(data)
    });

    form.reset();
    setText("postStatus", "Article published successfully!");

    await refreshDashboard();
    showView("articles");

  } catch (error) {
    setText("postStatus", error.message);
  } finally {
    button.disabled = false;
  }
});

/* NAV BUTTONS */

document.querySelectorAll(".nav-item").forEach(button => {
  button.addEventListener("click", () => {
    showView(button.dataset.view);
  });
});

/* REFRESH */

$("refreshBtn").addEventListener("click", async () => {
  const button = $("refreshBtn");
  button.disabled = true;
  button.textContent = "↻ Loading...";

  await refreshDashboard();

  button.disabled = false;
  button.textContent = "↻ Refresh";
});
   

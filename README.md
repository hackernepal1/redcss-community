# REDCSS Community — Full-stack website

A responsive black/red cybersecurity community website for **Red CyberSecurity Society (REDCSS)**. Built with plain HTML/CSS/JavaScript on the frontend and Node.js + Express on the backend. Data is stored in a local JSON database.

## Included

- Futuristic, responsive landing page with custom 3D-style shield artwork and motion effects
- About, learning pathways, featured three-month practical course, articles, community, and contact sections
- Public API for articles and courses
- Contact form that saves messages to `data/db.json`
- Admin console at `/admin.html` to sign in, publish/delete articles, and review/mark contact messages as read
- Basic security headers, rate limits, input validation, JWT admin sessions, and password hashing

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
cp .env.example .env
```

Generate a bcrypt password hash (replace `YOUR_ADMIN_PASSWORD`):

```bash
node -e "require('bcryptjs').hash('YOUR_ADMIN_PASSWORD', 12).then(console.log)"
```

Put the generated hash in `.env` as `ADMIN_PASSWORD_HASH=...`. Also replace `JWT_SECRET` with a long random secret and set `ADMIN_USERNAME`.

Start the website:

```bash
npm start
```

Open:
- Website: http://localhost:3000
- Admin: http://localhost:3000/admin.html
- API health: http://localhost:3000/api/health

## Deploy

Deploy to a Node.js hosting provider (for example, Render, Railway, or a VPS). Set the environment variables from `.env.example` in the host dashboard. Use a persistent disk/volume for the `data/` directory because the JSON store is file-based. Set `ALLOWED_ORIGIN` to your production origin. Enable HTTPS. Never upload `.env` or expose admin credentials.

## Important notes

- Existing public website content was used as a starting point: REDCSS, established 2019, Jageshwar Kushwaha, cyber defense and web application security, practical cybersecurity course, and the visible article topics (phishing/social engineering, Wireshark, OWASP Top 10, brute-force defense, and Nmap auditing).
- The current Blogger website may contain additional pages, images, member details, and full article bodies that are not visible on its homepage. Replace/add those assets and content after exporting or sharing them.
- Contact form messages are stored on your server; configure backups and a privacy notice before production use. Add CSRF protection and an email delivery provider if you later add cross-origin admin workflows or email notifications.
- The design uses a custom vector shield illustration, not an official supplied logo file. Replace it with your official logo if available.

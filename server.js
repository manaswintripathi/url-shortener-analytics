// Built by Manaswin Tripathi (@manaswintripathi)
// URL Shortener + Analytics — Node.js + Express + JSON file storage.
// Run: npm install && npm start, then open http://localhost:3000

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Storage ----------
function seedData() {
  const today = new Date();
  const day = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };
  // 3 sample links with a few clicks spread over the last days.
  return {
    links: [
      {
        code: 'github',
        url: 'https://github.com',
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        clicks: 12,
        clickLog: [day(0), day(0), day(0), day(1), day(1), day(2), day(2), day(3), day(4), day(5), day(5), day(6)],
      },
      {
        code: 'wiki',
        url: 'https://www.wikipedia.org',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        clicks: 7,
        clickLog: [day(0), day(1), day(2), day(2), day(3), day(4), day(6)],
      },
      {
        code: 'mdn',
        url: 'https://developer.mozilla.org',
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        clicks: 4,
        clickLog: [day(0), day(1), day(3), day(5)],
      },
    ],
  };
}

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (parsed && Array.isArray(parsed.links)) return parsed;
    }
  } catch (e) {
    console.error('Could not read data.json, re-seeding:', e.message);
  }
  const seeded = seedData();
  saveData(seeded);
  return seeded;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let db = loadData();

// ---------- Helpers ----------
function isValidUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function randomCode(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function uniqueCode() {
  let code;
  do {
    code = randomCode(6);
  } while (db.links.some((l) => l.code === code));
  return code;
}

function isValidAlias(alias) {
  return typeof alias === 'string' && /^[a-zA-Z0-9_-]{3,20}$/.test(alias.trim());
}

function publicLink(link, req) {
  const base = `${req.protocol}://${req.get('host')}`;
  return {
    code: link.code,
    url: link.url,
    shortUrl: `${base}/${link.code}`,
    createdAt: link.createdAt,
    clicks: link.clicks,
  };
}

// ---------- API ----------
// List links (optional ?search= filters code or url, case-insensitive)
app.get('/api/links', (req, res) => {
  const q = (req.query.search || '').toString().trim().toLowerCase();
  const links = db.links
    .filter((l) => !q || l.code.toLowerCase().includes(q) || l.url.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((l) => publicLink(l, req));
  res.json(links);
});

// Analytics: totals, clicks per day (last 14 days), top links
app.get('/api/stats', (req, res) => {
  const totalLinks = db.links.length;
  const totalClicks = db.links.reduce((sum, l) => sum + (l.clicks || 0), 0);

  const days = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const clicksByDay = {};
  days.forEach((d) => { clicksByDay[d] = 0; });
  db.links.forEach((l) => {
    (l.clickLog || []).forEach((d) => {
      if (d in clicksByDay) clicksByDay[d] += 1;
    });
  });

  const topLinks = [...db.links]
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 5)
    .map((l) => publicLink(l, req));

  res.json({
    totalLinks,
    totalClicks,
    clicksPerDay: days.map((date) => ({ date, clicks: clicksByDay[date] })),
    topLinks,
  });
});

// Create a short link
app.post('/api/links', (req, res) => {
  const { url, alias } = req.body || {};

  if (!isValidUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid URL starting with http:// or https://' });
  }

  let code;
  if (alias !== undefined && alias !== null && String(alias).trim() !== '') {
    if (!isValidAlias(alias)) {
      return res.status(400).json({ error: 'Custom alias must be 3–20 characters: letters, numbers, - or _ only.' });
    }
    code = String(alias).trim();
    if (db.links.some((l) => l.code === code)) {
      return res.status(409).json({ error: `Alias "${code}" is already taken. Try a different one.` });
    }
  } else {
    code = uniqueCode();
  }

  const link = {
    code,
    url: url.trim(),
    createdAt: new Date().toISOString(),
    clicks: 0,
    clickLog: [],
  };
  db.links.push(link);
  saveData(db);
  res.status(201).json(publicLink(link, req));
});

// Delete one link
app.delete('/api/links/:code', (req, res) => {
  const before = db.links.length;
  db.links = db.links.filter((l) => l.code !== req.params.code);
  if (db.links.length === before) {
    return res.status(404).json({ error: 'Link not found.' });
  }
  saveData(db);
  res.json({ ok: true });
});

// Clear all links (removes the seed data too)
app.delete('/api/links', (req, res) => {
  db = { links: [] };
  saveData(db);
  res.json({ ok: true });
});

// ---------- Redirect ----------
// Must come after /api/* routes so API calls are not treated as codes.
app.get('/:code', (req, res) => {
  const link = db.links.find((l) => l.code === req.params.code);
  if (!link) {
    return res.status(404).send('Short link not found. Built by Manaswin Tripathi (@manaswintripathi)');
  }
  link.clicks = (link.clicks || 0) + 1;
  link.clickLog = link.clickLog || [];
  link.clickLog.push(new Date().toISOString().slice(0, 10));
  saveData(db);
  res.redirect(link.url);
});

app.listen(PORT, () => {
  console.log(`URL Shortener + Analytics running at http://localhost:${PORT}`);
  console.log('Built by Manaswin Tripathi (@manaswintripathi)');
});

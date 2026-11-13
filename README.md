# URL Shortener + Analytics

Built by Manaswin Tripathi (@manaswintripathi)

A fast, self-hosted URL shortener with a built-in analytics dashboard. Shorten any link, share the short URL, and track every click — per link and per day — from one clean page. No database server needed: links and click history are stored in a simple JSON file.

## Features

- **Shorten any valid URL** — server-side validation (only `http://` / `https://` accepted)
- **Random 6-character codes** — plus optional **custom aliases** with collision checking (3–20 chars, letters/numbers/`-`/`_`)
- **Redirect + click counting** — visiting `/:code` redirects to the original URL and logs the click
- **Analytics dashboard**
  - Total links and total clicks
  - Clicks per day for the last 14 days (bar chart drawn with plain canvas — no CDN)
  - Top 5 links table
- **Manage links** — search by code or URL, copy short link to clipboard, delete individual links, or clear all
- **Seeded sample data** — starts with 3 sample links (GitHub, Wikipedia, MDN) with click history, so the dashboard works on first run; clearable with one click

## Tech Stack

- **Backend:** Node.js + Express (only dependency)
- **Storage:** JSON file (`data.json`, auto-created on first run)
- **Frontend:** Vanilla HTML / CSS / JavaScript — no frameworks, no CDN

## Setup / Run

```bash
npm install
npm start
```

Then open http://localhost:3000

To run on a different port:

```bash
PORT=4000 npm start
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/links?search=` | List links (optional search filter) |
| `POST` | `/api/links` | Create a link — body: `{"url": "...", "alias": "optional"}` |
| `DELETE` | `/api/links/:code` | Delete one link |
| `DELETE` | `/api/links` | Delete all links |
| `GET` | `/api/stats` | Totals, clicks per day (last 14 days), top links |
| `GET` | `/:code` | Redirect to the original URL (counts a click) |

Example — create a link:

```bash
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/page", "alias": "example"}'
```

## Project Structure

```
url-shortener-analytics/
├── server.js          # Express server, API + redirect + JSON storage
├── package.json
├── README.md
├── .gitignore
├── data.json          # Auto-created on first run (gitignored)
└── public/
    ├── index.html     # Dashboard UI
    ├── style.css      # Styling
    └── app.js         # Dashboard logic, canvas chart, copy/search/delete
```

## Notes

- `data.json` is created automatically with 3 sample links on first run. Press **Clear all** in the dashboard (or delete `data.json` and restart) to start empty.
- Custom aliases are case-sensitive and must be unique — a taken alias returns `409`.

---

Built by Manaswin Tripathi (@manaswintripathi)

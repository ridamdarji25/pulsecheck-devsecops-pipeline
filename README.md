# PulseCheck 🩺

> **Live service status monitoring dashboard** — a 2-tier web application
> built with React + Tailwind CSS + Framer Motion on the frontend, and
> Node.js + Express on the backend.

---

## Project Structure

```
pulsecheck-app/
├── frontend/               # React + Vite + Tailwind CSS v4 + Framer Motion
│   ├── src/
│   │   ├── components/
│   │   │   ├── TopBar.jsx      # Sticky header with logo + live clock
│   │   │   ├── HeroSection.jsx # Tagline, aggregate status, stat pills
│   │   │   ├── StatusGrid.jsx  # Responsive card grid + loading/error states
│   │   │   └── StatusCard.jsx  # Individual service card with animations
│   │   ├── App.jsx             # Root component — polling + state management
│   │   ├── api.js              # Thin fetch client (base URL from env var)
│   │   ├── index.css           # Tailwind v4 entry + design tokens
│   │   └── main.jsx            # React DOM mount
│   ├── public/
│   │   └── favicon.svg         # Custom ECG-style brand icon
│   ├── index.html              # HTML shell with SEO meta tags
│   ├── vite.config.js          # Vite config: Tailwind plugin + dev proxy
│   └── .env                    # VITE_API_BASE_URL (empty = use dev proxy)
│
└── backend/                # Node.js + Express REST API
    ├── config/
    │   └── services.js         # Configurable list of monitored services
    ├── routes/
    │   └── statusRouter.js     # GET /api/status — parallel service pings
    ├── server.js               # Express bootstrap + CORS + health endpoint
    ├── package.json
    └── .env                    # PORT and FRONTEND_ORIGIN defaults
```

---

## Quick Start

### 1. Start the backend

```bash
cd pulsecheck-app/backend
npm install          # already done if following docs
npm start            # or: npm run dev  (uses node --watch for auto-reload)
```

Backend runs on **http://localhost:3001**

### 2. Start the frontend (separate terminal)

```bash
cd pulsecheck-app/frontend
npm install          # already done
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## API Endpoints

| Method | Path          | Description                              |
|--------|---------------|------------------------------------------|
| `GET`  | `/api/status` | Returns JSON array of all service health |
| `GET`  | `/health`     | Kubernetes liveness/readiness probe      |

### Example `/api/status` response

```json
[
  { "name": "GitHub",    "url": "https://...", "status": "up",   "latencyMs": 312 },
  { "name": "AWS",       "url": "https://...", "status": "slow", "latencyMs": 921 },
  { "name": "MyService", "url": "https://...", "status": "down", "latencyMs": 5001 }
]
```

Status values:

| Value  | Meaning                                          |
|--------|--------------------------------------------------|
| `up`   | HTTP 2xx/3xx/4xx, latency ≤ 800 ms              |
| `slow` | HTTP 2xx/3xx/4xx, latency > 800 ms              |
| `down` | Network error, timeout, or HTTP 5xx             |

---

## Adding / Removing Services

Edit **`backend/config/services.js`** — no other files need changing:

```js
const SERVICES = [
  { name: "My API", url: "https://my-api.example.com/health" },
  // ...
];
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable          | Default                    | Description                       |
|-------------------|----------------------------|-----------------------------------|
| `PORT`            | `3001`                     | Port Express listens on           |
| `FRONTEND_ORIGIN` | `http://localhost:5173`    | Allowed CORS origin               |

### Frontend (`frontend/.env`)

| Variable            | Default | Description                                          |
|---------------------|---------|------------------------------------------------------|
| `VITE_API_BASE_URL` | (empty) | Backend URL. Empty = use Vite dev proxy in dev mode  |

---

## Docker / Production Notes

- **Backend**: `node server.js` — reads `PORT` from env. Non-root friendly.
- **Frontend**: `npm run build` → static files in `dist/` → serve with Nginx.
- Backend listens on `0.0.0.0` by default (Express default), suitable for containers.
- In production, set `VITE_API_BASE_URL=https://api.your-domain.com` at build time.

---

## Tech Stack

| Layer     | Technology                              | Why                                          |
|-----------|-----------------------------------------|----------------------------------------------|
| Frontend  | React 19 + Vite 8                       | Fast HMR, modern JSX transform               |
| Styling   | Tailwind CSS v4 (@tailwindcss/vite)     | CSS-first config, zero PostCSS overhead      |
| Animation | Framer Motion                           | Declarative enter animations, layout motion  |
| Backend   | Node.js + Express 5                     | Minimal footprint, async/await native        |
| HTTP ping | axios                                   | Timeout config + redirect following          |
| CORS      | cors npm package                        | Origin-restricted, not wildcard              |

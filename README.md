# DealerPulse

Real-time performance dashboard for a 5-branch automotive dealership group.
Built for the Industrial IQ Forward Deployed Engineer take-home.

**Live demo:** https://dealer-pulse-tawny.vercel.app/

## Stack

- **Backend:** Python + FastAPI (`/api`) — all metrics, health scoring, and aggregations.
- **Frontend:** Next.js + TypeScript + Tailwind CSS, charts via Recharts.
- **Deploy:** Vercel (Next.js frontend + Python serverless functions, one deploy).

## Project layout

```
api/            Python (FastAPI) backend
  index.py        app entry + routes
  data/           dealership_data.json
  core/           metrics, branches, bottlenecks, deliveries, whatif (coming next)
app/            Next.js frontend (App Router)
components/      reusable UI (Card, Table, Badge, Select, charts…)
lib/            api client + formatting helpers
types/          shared TypeScript types
```

## Run locally

Prerequisites: **Node.js 18+** and **Python 3.9+**.

```bash
# 1. install frontend deps
npm install

# 2. install backend deps (in a virtualenv)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 3. run both servers together
npm run dev:all
```

Then open http://localhost:3000. The frontend proxies `/api/*` to the
FastAPI server on port 8000 during development.

To run them separately: `npm run dev` (web) and `npm run api` (backend).

## Deploy

Push to GitHub and import the repo in Vercel. `vercel.json` routes
`/api/*` to the FastAPI function; the Next.js app builds automatically.

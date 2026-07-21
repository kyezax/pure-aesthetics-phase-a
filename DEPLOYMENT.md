# Deploying Pure Aesthetics (Phase A)

This app is two independent pieces that deploy to two different places:

- **Backend** (`backend/`) — FastAPI + SQLAlchemy. Needs a real host that runs a
  persistent process and a real database. **Not Vercel-compatible.**
- **Frontend** (`frontend/`) — a Create React App SPA. This is what goes on
  Vercel.

Deploy the backend first — the frontend needs its URL.

## 1. Backend → Render

The repo includes `render.yaml` at the root, so you can deploy via Render's
Blueprint flow instead of clicking through manual setup:

1. In the Render dashboard: **New → Blueprint**, point it at this repo/branch.
2. Render reads `render.yaml` and provisions:
   - A free Postgres database (`pure-aesthetics-db`)
   - A Python web service (`pure-aesthetics-backend`) running
     `uvicorn server:app`, wired to that database via `DATABASE_URL`
   - `SECRET_KEY` and `ADMIN_PASSWORD` auto-generated as real secrets (not
     committed anywhere)
3. Before or after the first deploy, set `ADMIN_EMAIL` in the service's
   Environment tab to the address you actually want to log in with.
4. After the first deploy finishes, open the service's **Environment** tab and
   reveal the generated `ADMIN_PASSWORD` — that's your login. Change it (or
   set a new one and redeploy) once you're in.
5. Note the service's public URL, e.g. `https://pure-aesthetics-backend.onrender.com`
   — the frontend needs it in step 2 below.

Render's free Postgres tier is fine to get live this week, but it's typically
time-limited (auto-expires after a period of inactivity/free-tier limits) —
upgrade to a paid plan once you're taking real bookings so the database
doesn't get reclaimed.

If you'd rather use Railway or your own host: the only two things that matter
are (a) run `uvicorn server:app --host 0.0.0.0 --port $PORT` from the
`backend/` directory, and (b) set the environment variables described in
`backend/.env.example`.

## 2. Frontend → Vercel

1. In Vercel: **New Project**, import this repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Create React App
   (build command `yarn build` / `npm run build`, output `build`).
3. Add an Environment Variable: `REACT_APP_BACKEND_URL` =
   `https://pure-aesthetics-backend.onrender.com` (your Render URL from step
   1, no trailing slash). Set it for both Production and Preview.
4. Deploy. `frontend/vercel.json` is already in the repo — it adds the
   catch-all rewrite to `index.html` that client-side routes (`/admin/services`,
   etc.) need so a hard refresh or deep link doesn't 404.

## 3. Close the loop: CORS

Once you have the real Vercel URL, go back to the Render service's
Environment tab and set:

```
CORS_ORIGINS=https://your-app.vercel.app
```

(comma-separate multiple origins if you also have a custom domain). Leaving
this as `*` works but allows any website to call the API from a browser —
fine for a first smoke test, not for real client data.

## 4. Before you tell real clients about it

- [ ] Logged in with the real admin account and changed the generated password
- [ ] `CORS_ORIGINS` set to your actual frontend origin(s), not `*`
- [ ] `ADMIN_EMAIL` is an address you actually check
- [ ] Walked through Business Settings, Categories, Services, Pricing &
      Deposits, and Policies once with real clinic data (the seeded data is
      demo content — "Glow Beauty Salon", sample facials/laser services, etc.)
- [ ] Custom domain pointed at Vercel (and Render, if you want a branded API
      URL), if you have one

## Notes on what's simplified in this build

- Images are stored as external URLs, not uploaded/resized files — paste a
  hosted image link (e.g. from your own site or a CDN) rather than uploading
  from disk.
- Location uses manual address fields; there's no live Google Maps picker.
- Rich text fields (descriptions, policies) are plain text areas, not a full
  WYSIWYG toolbar.
- Category/service reordering uses up/down controls rather than drag-and-drop.

None of these block going live — they're just narrower than the full original
spec, and can be extended later.

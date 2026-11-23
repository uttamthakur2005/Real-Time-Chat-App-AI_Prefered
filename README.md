# Vartam

Vartam is a React chat client with an Express, MongoDB, Socket.IO, Redis, and Gemini backend.

## Local development

1. Copy `backend/.env.example` to `backend/.env` and set MongoDB, JWT, Redis, and Gemini values.
2. Copy `frontend/.env.example` to `frontend/.env` if the backend is not at `http://localhost:8000`.
3. Install and start each service in its own terminal:

   ```sh
   npm --prefix backend ci
   npm --prefix backend run dev
   npm --prefix frontend ci
   npm --prefix frontend run dev
   ```

4. Run checks with `npm --prefix backend test` and `npm --prefix frontend run build`.

## Production deployment

Deploy the backend and frontend as separate services:

- Backend working directory: `backend`; install with `npm ci`; start with `npm start`.
- Frontend working directory: `frontend`; install with `npm ci`; build with `npm run build`; publish `dist/`.
- Set the frontend build variable `VITE_API_URL` to the public HTTPS origin of the backend.
- Set backend variables from `backend/.env.example`; use `NODE_ENV=production`, the frontend's exact HTTPS origin for `CLIENT_URL` (no trailing slash), and a random `JWT_SECRET` of at least 32 characters.
- New signup passwords must be at least 12 characters; auth endpoints allow 20 attempts per IP per 15 minutes, and AI allows 5 requests per account per minute.
- Production startup requires MongoDB, Redis, and `GOOGLE_AI_KEY`. Set `REDIS_TLS=true` if the Redis provider requires TLS.
- If the app is behind a known single reverse proxy, set `TRUST_PROXY=1`; use the actual trusted proxy hop count for other topologies.
- Configure HTTPS on both services. The auth cookie is secure and cross-site in production.
- Point the platform readiness probe at `/health/ready` and its liveness probe at `/health/live`.

Authentication and AI requests share Redis-backed rate limits. Keep MongoDB and Redis private, enable backups for MongoDB, and never commit `.env` files.

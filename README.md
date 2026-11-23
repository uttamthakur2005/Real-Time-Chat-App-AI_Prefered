Vartam – Real-Time Chat Application
Vartam is a full-stack messaging application built with the MERN stack. It provides authenticated one-to-one messaging, live online presence, profile customization, and an AI chat assistant powered by Google Gemini.
Features
Authentication: User registration, login, and logout with JWT-based authentication stored in an HTTP-only cookie.
Password security: Password hashing and verification with bcrypt.
Real-time one-to-one chat: Socket.IO delivers messages instantly; messages are stored in MongoDB and can be loaded as conversation history.
Online presence: Live online/offline status and presence snapshots.
Redis integration: Redis-backed Socket.IO adapter and shared presence/rate-limit support.
AI assistant: Ask questions through the Gemini API and retrieve saved AI conversation history.
User search: Search and paginate through registered users.
Profile customization: Update display name and profile photo (JPEG, PNG, or WebP).
API protection: Authentication middleware, request validation, Helmet security headers, and rate limiting.
Health endpoints: Liveness and readiness checks for deployment monitoring.
Tech Stack
Frontend: React, Vite, Tailwind CSS, React Router, Socket.IO Client, React Markdown
Backend: Node.js, Express, MongoDB, Mongoose, Socket.IO, Redis, JWT, bcryptjs
AI: Google Gemini API
Project Structure
VartamChatApp/
├── backend/
│   ├── src/
│   │   ├── config/          # MongoDB, Redis, environment configuration
│   │   ├── controllers/     # Authentication, user, chat and AI logic
│   │   ├── middlewares/     # Authentication and rate limiting
│   │   ├── models/          # User, message, AI exchange and token models
│   │   ├── routes/          # User and chat API routes
│   │   ├── sockets/         # Socket.IO chat and presence events
│   │   └── utils/           # Token utilities
│   ├── test/                # Backend automated tests
│   └── server.js
├── frontend/
│   └── src/
│       ├── Pages/           # Signup, login and chat screens
│       ├── api.js
│       └── ...
├── .gitignore
└── README.md
Requirements
Node.js 22.12.0 or later
npm
MongoDB database
Redis server (required for production readiness and shared real-time presence/rate limiting)
Google AI API key for the Gemini assistant
Run Locally
1. Clone the repository
git clone https://github.com/YOUR-USERNAME/Vartam-Real-Time-Chat-App.git
cd Vartam-Real-Time-Chat-App
2. Configure environment variables
Create local environment files from the examples:
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
Set the values in backend/.env:
PORT=8000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
TRUST_PROXY=
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_TLS=false
GOOGLE_AI_KEY=your_google_ai_api_key
Set the frontend URL in frontend/.env:
VITE_API_URL=http://localhost:8000
Use the values required by your own MongoDB and Redis providers. Do not commit real credentials.
3. Install dependencies
Run from the project root:
npm --prefix backend ci
npm --prefix frontend ci
4. Start the application
Start the backend in one terminal:
npm --prefix backend run dev
Start the frontend in another terminal:
npm --prefix frontend run dev
Open the local URL printed by Vite (normally http://localhost:5173).
API Overview
All /chat endpoints require authentication.
Method
Endpoint
Description
POST
/users/signup
Register a new user
POST
/users/login
Log in
POST
/users/logout
Log out and invalidate the token
GET
/users/me
Get the authenticated user's profile
PATCH
/users/me
Update profile name/photo
GET
/chat/users
Search and paginate users
GET
/chat/:userId/messages
Load one-to-one conversation history
POST
/chat/ai
Send a prompt to the Gemini assistant
GET
/chat/ai/messages
Load saved AI conversation history
GET
/health/live
Liveness check
GET
/health/ready
Readiness check
Socket.IO Events
Event
Direction
Purpose
chat:send
Client → server
Send a message to another user
chat:message
Server → client
Deliver a new message
presence:snapshot
Server → client
Initial online-users snapshot
presence:update
Server → clients
Notify online/offline changes
profile:update
Server → clients
Notify profile-photo updates
Tests and Production Build
Run backend tests:
npm --prefix backend test
Build the frontend:
npm --prefix frontend run build
Deployment Notes
The frontend and backend can be deployed as separate services.
Backend root directory: backend; install command: npm ci; start command: npm start.
Frontend root directory: frontend; install command: npm ci; build command: npm run build; publish directory: dist.
Set VITE_API_URL to the deployed backend's HTTPS origin at frontend build time.
Set CLIENT_URL to the exact deployed frontend HTTPS origin on the backend.
Configure MongoDB, Redis, JWT_SECRET, and GOOGLE_AI_KEY as hosting-provider environment variables.
Use REDIS_TLS=true if your Redis provider requires TLS.
Configure HTTPS and the appropriate trusted proxy setting for your hosting environment.
Use /health/live and /health/ready for liveness and readiness probes.
Current Scope / Limitations
The current implementation supports email-and-password authentication and one-to-one text messaging. SMS/mobile OTP verification is not implemented yet. Group chats, voice/video calls, and end-to-end encryption are also not part of the current implementation.
Built as a full-stack portfolio project.

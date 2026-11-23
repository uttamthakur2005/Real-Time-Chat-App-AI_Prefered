Vartam – Real-Time Chat Application 💬

Vartam is a full-stack real-time messaging application built using the MERN stack. It provides seamless one-to-one communication with real-time message delivery, online user presence, secure authentication, and an AI-powered chat assistant.

The application combines modern web technologies with real-time communication to deliver a smooth and interactive messaging experience.

✨ Features

- 🔐 Secure Authentication – User registration and login using JWT authentication.
- 🔑 Password Hashing – Secure password storage using bcrypt.
- 💬 Real-Time Messaging – Instant one-to-one messaging powered by Socket.IO.
- 🟢 Online User Presence – Live online/offline status tracking.
- ⚡ Redis Integration – Redis-backed presence management and rate limiting.
- 🤖 AI Chat Assistant – Integrated Google Gemini API for AI-powered conversations.
- 👤 Profile Management – Update user profile details and profile pictures.
- 🔍 User Search – Search and discover registered users.
- 📄 Conversation History – Store and retrieve chat messages from MongoDB.
- 🛡️ Protected Routes – Authentication middleware and API request validation.
- 🚀 Health Check Endpoints – Backend liveness and readiness monitoring.

🛠️ Tech Stack

Frontend

- React.js
- Vite
- Tailwind CSS
- React Router
- Socket.IO Client
- React Markdown

Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- Socket.IO
- Redis
- JSON Web Token (JWT)
- bcryptjs
- express-validator
- Helmet

AI Integration

- Google Gemini API

📂 Project Structure

VartamChatApp/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── sockets/
│   │   └── utils/
│   ├── test/
│   ├── server.js
│   └── .env.example
│
├── frontend/
│   ├── public/
│   ├── src/
│   └── .env.example
│
├── README.md
└── .gitignore

⚙️ Installation & Setup

Prerequisites

Make sure you have installed:

- Node.js (22.12.0 or later)
- npm
- MongoDB
- Redis
- Google Gemini API Key

1. Clone the Repository

git clone https://github.com/YOUR-GITHUB-USERNAME/Vartam-Real-Time-Chat-App.git

cd Vartam-Real-Time-Chat-App

2. Backend Setup

cd backend
npm install

Create a ".env" file inside the backend folder and configure:

PORT=8000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_TLS=false
GOOGLE_AI_KEY=your_google_ai_api_key

3. Frontend Setup

Open another terminal:

cd frontend
npm install

Create a ".env" file inside the frontend folder:

VITE_API_URL=http://localhost:8000

4. Run the Application

Start Backend:

cd backend
npm run dev

Start Frontend:

cd frontend
npm run dev

Open the local URL provided by Vite in your browser.

🔌 API Endpoints

Method| Endpoint| Description
POST| "/users/signup"| Register a new user
POST| "/users/login"| Login user
POST| "/users/logout"| Logout user
GET| "/users/me"| Get current user
PATCH| "/users/me"| Update user profile
GET| "/chat/users"| Search and retrieve users
GET| "/chat/:userId/messages"| Get conversation messages
POST| "/chat/ai"| Send prompt to AI assistant
GET| "/chat/ai/messages"| Get AI conversation history
GET| "/health/live"| Backend liveness check
GET| "/health/ready"| Backend readiness check

⚡ Real-Time Socket Events

Event| Description
"chat:send"| Send a message
"chat:message"| Receive a real-time message
"presence:snapshot"| Get online users
"presence:update"| Receive online/offline updates
"profile:update"| Receive profile updates

🧪 Testing

Run backend tests:

cd backend
npm test

Build the frontend:

cd frontend
npm run build

🔒 Security

- JWT-based authentication.
- HTTP-only authentication cookies.
- Password hashing using bcrypt.
- Protected API routes.
- Request validation.
- Rate limiting.
- Security headers using Helmet.
- Environment variables for sensitive configuration.

Important: Never commit ".env" files, API keys, passwords, or database credentials to GitHub.

🚀 Future Enhancements

- Mobile number OTP verification.
- Message read receipts.
- Typing indicators.
- Image and file sharing.
- Group conversations.
- Message editing and deletion.
- Voice and video calling.
- End-to-end encryption.

👨‍💻 Developer

Developed as a full-stack MERN portfolio project.

GitHub: https://github.com/YOUR-GITHUB-USERNAME

---

⭐ If you like this project, consider giving it a star!

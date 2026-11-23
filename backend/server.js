require('dotenv').config()
const http = require('node:http')
const { Server } = require('socket.io')
const mongoose = require('mongoose')
const app = require('./src/app')
const connectDB = require('./src/config/db')
const registerChatSocket = require('./src/sockets/chat.socket')
const { configureRedis, createPresenceStore } = require('./src/config/redis')
const { createRateLimiters } = require('./src/middlewares/rate-limit.middleware')
const validateEnvironment = require('./src/config/environment')

const port = process.env.PORT || 8000
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || 'https://real-time-chat-app-ai-prefered.onrender.com',
        credentials: true
    }
})

app.set('io', io)

let redisConnections
let shuttingDown = false

async function startServer() {
    validateEnvironment()
    await connectDB()
    redisConnections = await configureRedis(io)
    const redis = redisConnections?.client || null
    app.set('redisClient', redis)
    app.set('rateLimiters', createRateLimiters(redis))
    app.set('presenceStore', createPresenceStore(redis))
    registerChatSocket(io, app.get('presenceStore'))

    server.listen(port, () => {
        console.log(`Server Started on port no ${port}`)
    })
}

async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`${signal} received; closing server connections.`)

    await new Promise((resolve) => io.close(resolve))
    await Promise.all([
        mongoose.disconnect(),
        redisConnections?.close()
    ])
}

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
        shutdown(signal).catch((error) => {
            console.error('Graceful shutdown failed:', error.message)
            process.exitCode = 1
        })
    })
}

startServer().catch(async (error) => {
    console.error('Server startup failed:', error.message)
    await mongoose.disconnect().catch((closeError) => {
        console.error('Database cleanup failed:', closeError.message)
    })
    await redisConnections?.close().catch((closeError) => {
        console.error('Redis cleanup failed:', closeError.message)
    })
    process.exitCode = 1
})

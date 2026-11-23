const cookieParser = require('cookie-parser')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const mongoose = require('mongoose')
const userRouter = require('./routes/user.routes')
const chatRouter = require('./routes/chat.routes')


const app = express()

if (process.env.TRUST_PROXY) {
    const proxyHops = Number(process.env.TRUST_PROXY)
    if (!Number.isInteger(proxyHops) || proxyHops < 0) {
        throw new Error('TRUST_PROXY must be a non-negative proxy hop count')
    }
    app.set('trust proxy', proxyHops)
}

app.use(helmet())
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
app.use(cors({
    origin: process.env.CLIENT_URL || 'https://real-time-chat-app-ai-prefered.onrender.com',
    credentials: true
}))

app.get('/health/live', (req, res) => res.status(200).json({ status: 'live' }))
app.get('/health/ready', (req, res) => {
    const databaseReady = mongoose.connection.readyState === 1
    const redisReady = process.env.NODE_ENV !== 'production' || req.app.get('redisClient')?.isReady
    const ready = databaseReady && redisReady
    return res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not ready' })
})

app.use('/users', userRouter)
app.use('/chat', chatRouter)

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }))
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)

    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 500
        ? error.status
        : 500
    if (status === 500) console.error('Unhandled request error:', error.message)

    return res.status(status).json({
        message: status === 500 ? 'Internal server error.' : error.message
    })
})

module.exports = app

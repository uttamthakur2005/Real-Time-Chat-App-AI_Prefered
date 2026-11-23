const jwt = require('jsonwebtoken')
const mongoose = require('mongoose')
const messageModel = require('../models/message.model')
const userModel = require('../models/user.model')
const tokenBlacklistModel = require('../models/token-blacklist.model')
const { hashToken } = require('../utils/token')

function registerChatSocket(io, presenceStore) {
    io.use(async (socket, next) => {
        const token = socket.handshake.headers.cookie
            ?.split(';')
            .map((cookie) => cookie.trim())
            .find((cookie) => cookie.startsWith('token='))
            ?.slice(6)

        if (!token) {
            return next(new Error('Unauthorized'))
        }

        let user
        try {
            user = jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET)
        } catch (error) {
            return next(new Error('Unauthorized'))
        }

        try {
            if (await tokenBlacklistModel.exists({ tokenHash: hashToken(token) })) {
                return next(new Error('Unauthorized'))
            }
            socket.data.userId = String(user._id)
            return next()
        } catch (error) {
            return next(error)
        }
    })

    io.on('connection', (socket) => {
        socket.join(socket.data.userId)

        let presenceTimer
        let presenceRegistered = false
        let disconnected = false

        socket.on('disconnect', async () => {
            disconnected = true
            clearInterval(presenceTimer)
            if (!presenceRegistered) return

            try {
                const becameOffline = await presenceStore.disconnect(socket.data.userId, socket.id)
                if (becameOffline) {
                    io.emit('presence:update', { userId: socket.data.userId, online: false })
                }
            } catch (error) {
                console.error('Presence cleanup failed:', error.message)
            }
        })

        socket.on('chat:send', async (payload = {}, callback) => {
            const acknowledge = typeof callback === 'function' ? callback : () => {}
            const recipientId = payload.recipientId
            const text = typeof payload.text === 'string' ? payload.text.trim() : ''

            if (!mongoose.isValidObjectId(recipientId) ||
                String(recipientId) === socket.data.userId ||
                !text ||
                text.length > 2000) {
                return acknowledge({ error: 'Invalid message' })
            }

            try {
                if (!await userModel.exists({ _id: recipientId })) {
                    return acknowledge({ error: 'User not found' })
                }

                const message = await messageModel.create({
                    sender: socket.data.userId,
                    recipient: recipientId,
                    text
                })

                io.to(String(recipientId))
                    .to(socket.data.userId)
                    .emit('chat:message', message)
                return acknowledge({ message })
            } catch (error) {
                console.error(error)
                return acknowledge({ error: 'Message could not be sent' })
            }
        })

        async function initializePresence() {
            try {
                const becameOnline = await presenceStore.connect(socket.data.userId, socket.id)
                presenceRegistered = true
                if (disconnected) {
                    await presenceStore.disconnect(socket.data.userId, socket.id)
                    return
                }

                if (becameOnline) {
                    io.emit('presence:update', { userId: socket.data.userId, online: true })
                }

                const users = await userModel
                    .find({ _id: { $ne: socket.data.userId } })
                    .select('_id')
                    .sort({ userName: 1 })
                    .limit(50)
                if (disconnected) return

                const onlineUsers = await Promise.all(users.map(async (user) =>
                    await presenceStore.isOnline(String(user._id)) ? String(user._id) : null))
                if (disconnected) return
                socket.emit('presence:snapshot', onlineUsers.filter(Boolean))

                presenceTimer = setInterval(() => {
                    presenceStore.touch(socket.data.userId, socket.id)
                        .catch((error) => console.error('Presence refresh failed:', error.message))
                }, 30000)
            } catch (error) {
                console.error('Presence initialization failed:', error.message)
                socket.disconnect(true)
            }
        }

        initializePresence()
    })
}

module.exports = registerChatSocket

const { createClient } = require('redis')
const { createAdapter } = require('@socket.io/redis-adapter')

async function configureRedis(io) {
    if (!process.env.REDIS_HOST) {
        console.warn('REDIS_HOST is not configured; using in-memory presence without the Redis adapter.')
        return null
    }

    const port = Number(process.env.REDIS_PORT || 6379)
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('REDIS_PORT must be a valid TCP port')
    }

    const options = {
        socket: {
            host: process.env.REDIS_HOST,
            port,
            connectTimeout: 5000,
            tls: process.env.REDIS_TLS === 'true',
            reconnectStrategy: (retries) => retries > 3
                ? new Error('Redis connection failed after 3 retries')
                : Math.min(retries * 250, 1000)
        },
        ...(process.env.REDIS_PASSWORD ? { password: process.env.REDIS_PASSWORD } : {})
    }
    const publisher = createClient(options)
    publisher.on('error', (error) => console.error('Redis publisher error:', error.message))

    let subscriber
    try {
        await publisher.connect()
        subscriber = publisher.duplicate()
        subscriber.on('error', (error) => console.error('Redis subscriber error:', error.message))
        await subscriber.connect()
    } catch (error) {
        await Promise.all([publisher, subscriber]
            .filter((client) => client?.isOpen)
            .map((client) => client.quit().catch((closeError) => {
                console.error('Redis cleanup failed:', closeError.message)
            })))
        throw error
    }

    io.adapter(createAdapter(publisher, subscriber))
    console.log('Redis connected; Socket.IO Redis adapter enabled.')
    return {
        client: publisher,
        async close() {
            await Promise.all([subscriber, publisher]
                .filter((client) => client.isOpen)
                .map((client) => client.quit()))
        }
    }
}

function createPresenceStore(redis) {
    if (!redis) {
        const users = new Map()
        return {
            async connect(userId, socketId) {
                const sockets = users.get(userId) || new Set()
                const wasOffline = sockets.size === 0
                sockets.add(socketId)
                users.set(userId, sockets)
                return wasOffline
            },
            async disconnect(userId, socketId) {
                const sockets = users.get(userId)
                if (!sockets) return true
                sockets.delete(socketId)
                if (sockets.size === 0) users.delete(userId)
                return sockets.size === 0
            },
            async touch() {},
            async isOnline(userId) {
                return (users.get(userId)?.size || 0) > 0
            }
        }
    }

    const keyFor = (userId) => `vartam:presence:${userId}`
    const ttlSeconds = 90

    return {
        async connect(userId, socketId) {
            const key = keyFor(userId)
            const count = await redis.eval(
                "redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1]); local n = redis.call('ZCARD', KEYS[1]); redis.call('ZADD', KEYS[1], ARGV[2], ARGV[3]); redis.call('EXPIRE', KEYS[1], ARGV[4]); return n",
                { keys: [key], arguments: [String(Date.now()), String(Date.now() + ttlSeconds * 1000), socketId, String(ttlSeconds)] }
            )
            return Number(count) === 0
        },
        async disconnect(userId, socketId) {
            const key = keyFor(userId)
            const count = await redis.eval(
                "redis.call('ZREM', KEYS[1], ARGV[1]); redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[2]); local n = redis.call('ZCARD', KEYS[1]); if n == 0 then redis.call('DEL', KEYS[1]); end; return n",
                { keys: [key], arguments: [socketId, String(Date.now())] }
            )
            return Number(count) === 0
        },
        async touch(userId, socketId) {
            const key = keyFor(userId)
            await redis.eval(
                "if redis.call('ZSCORE', KEYS[1], ARGV[1]) then redis.call('ZADD', KEYS[1], ARGV[2], ARGV[1]); redis.call('EXPIRE', KEYS[1], ARGV[3]); end",
                { keys: [key], arguments: [socketId, String(Date.now() + ttlSeconds * 1000), String(ttlSeconds)] }
            )
        },
        async isOnline(userId) {
            const key = keyFor(userId)
            await redis.zRemRangeByScore(key, '-inf', Date.now())
            return await redis.zCard(key) > 0
        }
    }
}

module.exports = { configureRedis, createPresenceStore }

const { rateLimit } = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')

function createRateLimiters(redis) {
    function store(prefix) {
        if (!redis) return undefined

        return new RedisStore({
            prefix,
            sendCommand: (...args) => redis.sendCommand(args)
        })
    }

    return {
        auth: rateLimit({
            windowMs: 15 * 60 * 1000,
            limit: 20,
            standardHeaders: true,
            legacyHeaders: false,
            message: { message: 'Too many authentication attempts. Try again in 15 minutes.' },
            store: store('vartam:rate-limit:auth:')
        }),
        ai: rateLimit({
            windowMs: 60 * 1000,
            limit: 5,
            keyGenerator: (req) => String(req.user._id),
            standardHeaders: true,
            legacyHeaders: false,
            message: { message: 'AI message limit reached. Try again in a minute.' },
            store: store('vartam:rate-limit:ai:')
        })
    }
}

function applyRateLimit(name) {
    return (req, res, next) => {
        const limiter = req.app.get('rateLimiters')?.[name]
        if (!limiter) {
            return res.status(503).json({ message: 'Request protection is not ready.' })
        }
        return limiter(req, res, next)
    }
}

module.exports = { createRateLimiters, applyRateLimit }

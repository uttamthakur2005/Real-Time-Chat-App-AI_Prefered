function validateEnvironment(env = process.env) {
    if (env.NODE_ENV !== 'production') return

    const required = ['MONGO_URI', 'JWT_SECRET', 'CLIENT_URL', 'REDIS_HOST', 'GOOGLE_AI_KEY']
    const missing = required.filter((name) => !env[name]?.trim())
    if (missing.length > 0) {
        throw new Error(`Missing production environment variables: ${missing.join(', ')}`)
    }

    if (env.JWT_SECRET.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters in production')
    }

    let clientUrl
    try {
        clientUrl = new URL(env.CLIENT_URL)
    } catch {
        throw new Error('CLIENT_URL must be a valid HTTPS origin')
    }

    if (clientUrl.protocol !== 'https:' || clientUrl.origin !== env.CLIENT_URL) {
        throw new Error('CLIENT_URL must be an HTTPS origin without a path or trailing slash')
    }
}

module.exports = validateEnvironment

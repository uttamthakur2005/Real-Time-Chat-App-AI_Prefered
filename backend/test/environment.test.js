const assert = require('node:assert/strict')
const test = require('node:test')
const validateEnvironment = require('../src/config/environment')

test('production environment requires secrets and service connections', () => {
    assert.throws(
        () => validateEnvironment({ NODE_ENV: 'production' }),
        /MONGO_URI, JWT_SECRET, CLIENT_URL, REDIS_HOST, GOOGLE_AI_KEY/
    )
})

test('production environment requires HTTPS and a strong JWT secret', () => {
    const config = {
        NODE_ENV: 'production',
        MONGO_URI: 'mongodb://database',
        JWT_SECRET: 'a'.repeat(32),
        CLIENT_URL: 'http://app.example',
        REDIS_HOST: 'redis.example',
        GOOGLE_AI_KEY: 'configured'
    }

    assert.throws(() => validateEnvironment(config), /HTTPS origin/)
    assert.doesNotThrow(() => validateEnvironment({
        ...config,
        CLIENT_URL: 'https://app.example'
    }))
})

test('development environment does not require production secrets', () => {
    assert.doesNotThrow(() => validateEnvironment({ NODE_ENV: 'development' }))
})

const assert = require('node:assert/strict')
const http = require('node:http')
const express = require('express')
const test = require('node:test')
const { applyRateLimit, createRateLimiters } = require('../src/middlewares/rate-limit.middleware')

test('AI limiter blocks requests over the per-account limit', async () => {
    const app = express()
    app.set('rateLimiters', createRateLimiters(null))
    app.post('/ai', (req, res, next) => {
        req.user = { _id: 'test-account' }
        next()
    }, applyRateLimit('ai'), (req, res) => res.json({ ok: true }))

    const server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

    try {
        const { port } = server.address()
        const statuses = []
        for (let request = 0; request < 6; request += 1) {
            const response = await fetch(`http://127.0.0.1:${port}/ai`, { method: 'POST' })
            statuses.push(response.status)
        }

        assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429])
    } finally {
        await new Promise((resolve, reject) => server.close((error) =>
            error ? reject(error) : resolve()))
    }
})

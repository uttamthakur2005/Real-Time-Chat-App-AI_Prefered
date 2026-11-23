const assert = require('node:assert/strict')
const http = require('node:http')
const test = require('node:test')
const app = require('../src/app')

test('health endpoints distinguish liveness from readiness', async () => {
    const server = http.createServer(app)
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

    try {
        const { port } = server.address()
        const liveResponse = await fetch(`http://127.0.0.1:${port}/health/live`)
        const readyResponse = await fetch(`http://127.0.0.1:${port}/health/ready`)

        assert.equal(liveResponse.status, 200)
        assert.deepEqual(await liveResponse.json(), { status: 'live' })
        assert.equal(readyResponse.status, 503)
        assert.deepEqual(await readyResponse.json(), { status: 'not ready' })
    } finally {
        await new Promise((resolve, reject) => server.close((error) =>
            error ? reject(error) : resolve()))
    }
})

const assert = require('node:assert/strict')
const test = require('node:test')
const { createPresenceStore } = require('../src/config/redis')

test('memory presence stays online until the last socket disconnects', async () => {
    const presence = createPresenceStore(null)

    assert.equal(await presence.connect('user-1', 'socket-1'), true)
    assert.equal(await presence.connect('user-1', 'socket-2'), false)
    assert.equal(await presence.isOnline('user-1'), true)
    assert.equal(await presence.disconnect('user-1', 'socket-1'), false)
    assert.equal(await presence.disconnect('user-1', 'socket-2'), true)
    assert.equal(await presence.isOnline('user-1'), false)
})

test('Redis presence uses sorted-set commands for multi-socket state', async () => {
    const results = [0, 0, 0]
    const calls = []
    const redis = {
        eval: async (script, options) => {
            calls.push({ script, options })
            return results.shift()
        },
        zRemRangeByScore: async () => 0,
        zCard: async () => 1
    }
    const presence = createPresenceStore(redis)

    assert.equal(await presence.connect('user-2', 'socket-3'), true)
    await presence.touch('user-2', 'socket-3')
    assert.equal(await presence.isOnline('user-2'), true)
    assert.equal(await presence.disconnect('user-2', 'socket-3'), true)
    assert.equal(calls.length, 3)
    assert.match(calls[0].script, /ZREMRANGEBYSCORE/)
    assert.match(calls[2].script, /ZREM/)
})

const assert = require('node:assert/strict')
const test = require('node:test')
const aiExchangeModel = require('../src/models/ai-exchange.model')
const { askAI, getAIMessages } = require('../src/controllers/chat.controller')

function responseRecorder() {
    return {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code
            return this
        },
        json(body) {
            this.body = body
            return this
        }
    }
}

test('AI endpoint sends chat history to Gemini and returns its answer', async () => {
    const originalKey = process.env.GOOGLE_AI_KEY
    const originalFetch = global.fetch
    const originalCreate = aiExchangeModel.create
    process.env.GOOGLE_AI_KEY = 'test-key'
    let request
    let savedExchange
    aiExchangeModel.create = async (exchange) => {
        savedExchange = exchange
        return { _id: 'exchange-id' }
    }
    global.fetch = async (url, options) => {
        request = { url, options }
        return {
            ok: true,
            json: async () => ({
                candidates: [{ content: { parts: [{ text: 'Hello back' }] } }]
            })
        }
    }

    try {
        const res = responseRecorder()
        await askAI({
            user: { _id: 'user-id' },
            body: { messages: [{ role: 'user', text: 'Hello' }] }
        }, res)

        assert.equal(res.statusCode, 200)
        assert.deepEqual(res.body, { answer: 'Hello back', exchangeId: 'exchange-id' })
        assert.deepEqual(savedExchange, { user: 'user-id', prompt: 'Hello', answer: 'Hello back' })
        assert.equal(request.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent')
        assert.equal(request.options.headers['x-goog-api-key'], 'test-key')
        assert.deepEqual(JSON.parse(request.options.body).contents, [
            { role: 'user', parts: [{ text: 'Hello' }] }
        ])
    } finally {
        global.fetch = originalFetch
        aiExchangeModel.create = originalCreate
        if (originalKey === undefined) delete process.env.GOOGLE_AI_KEY
        else process.env.GOOGLE_AI_KEY = originalKey
    }
})

test('AI history restores saved exchanges as ordered chat messages', async () => {
    const originalFind = aiExchangeModel.find
    aiExchangeModel.find = (filter) => {
        assert.deepEqual(filter, { user: 'user-id' })
        return {
            sort(order) {
                assert.deepEqual(order, { _id: -1 })
                return this
            },
            limit(size) {
                assert.equal(size, 51)
                return this
            },
            lean: async () => [{
                _id: 'saved-exchange',
                prompt: 'Write a loop',
                answer: '```js\nfor (;;) {}\n```'
            }]
        }
    }

    try {
        const res = responseRecorder()
        await getAIMessages({ user: { _id: 'user-id' }, query: {} }, res)
        assert.deepEqual(res.body, {
            messages: [
                { id: 'saved-exchange-user', role: 'user', text: 'Write a loop' },
                { id: 'saved-exchange-model', role: 'model', text: '```js\nfor (;;) {}\n```' }
            ],
            hasMore: false,
            nextCursor: null
        })
    } finally {
        aiExchangeModel.find = originalFind
    }
})

test('AI endpoint rejects malformed chat history without calling Gemini', async () => {
    const originalKey = process.env.GOOGLE_AI_KEY
    const originalFetch = global.fetch
    process.env.GOOGLE_AI_KEY = 'test-key'
    global.fetch = async () => {
        throw new Error('Gemini must not be called for invalid input')
    }

    try {
        const res = responseRecorder()
        await askAI({ body: { messages: [{ role: 'model', text: 'Not a user turn' }] } }, res)
        assert.equal(res.statusCode, 400)
        assert.equal(res.body.message, 'AI chat messages are invalid.')
    } finally {
        global.fetch = originalFetch
        if (originalKey === undefined) delete process.env.GOOGLE_AI_KEY
        else process.env.GOOGLE_AI_KEY = originalKey
    }
})

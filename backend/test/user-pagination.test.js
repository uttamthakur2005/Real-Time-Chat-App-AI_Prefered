const assert = require('node:assert/strict')
const test = require('node:test')
const userModel = require('../src/models/user.model')
const { getUsers } = require('../src/controllers/chat.controller')

test('user directory paginates results and escapes search text', async () => {
    const originalFind = userModel.find
    let queryFilter
    let requestedSkip
    let requestedLimit
    const results = Array.from({ length: 51 }, (_, index) => ({
        _id: `user-${index}`,
        toObject() {
            return { _id: this._id, userName: `person-${index}`, email: 'person@example.com' }
        }
    }))

    userModel.find = (filter) => {
        queryFilter = filter
        return {
            select() {
                return this
            },
            sort() {
                return this
            },
            skip(value) {
                requestedSkip = value
                return this
            },
            limit(value) {
                requestedLimit = value
                return Promise.resolve(results)
            }
        }
    }

    const response = {
        statusCode: 200,
        status(code) {
            this.statusCode = code
            return this
        },
        json(body) {
            this.body = body
            return this
        }
    }

    try {
        await getUsers({
            user: { _id: 'current-user' },
            query: { page: '2', search: 'person+' },
            app: { get: () => ({ isOnline: async () => false }) }
        }, response)

        assert.equal(queryFilter._id.$ne, 'current-user')
        assert.equal(queryFilter.$or[0].userName.source, 'person\\+')
        assert.equal(requestedSkip, 50)
        assert.equal(requestedLimit, 51)
        assert.equal(response.body.users.length, 50)
        assert.equal(response.body.hasMore, true)
        assert.equal(response.body.nextPage, 3)
    } finally {
        userModel.find = originalFind
    }
})

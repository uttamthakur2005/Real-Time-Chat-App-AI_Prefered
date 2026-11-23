const assert = require('node:assert/strict')
const test = require('node:test')
const userModel = require('../src/models/user.model')
const userController = require('../src/controllers/user.controller')

test('login keeps the JWT in the HttpOnly cookie instead of the JSON body', async () => {
    const originalFindOne = userModel.findOne
    const originalComparePassword = userModel.comparePassword
    const user = {
        password: 'stored-hash',
        GenerateJWT: () => 'signed-token',
        toObject: () => ({ email: 'person@example.com', password: 'stored-hash' })
    }
    userModel.findOne = async () => user
    userModel.comparePassword = async () => true

    const response = {
        statusCode: 200,
        cookie(name, value, options) {
            this.authCookie = { name, value, options }
            return this
        },
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
        await userController.userLogin({
            body: { email: 'person@example.com', password: 'safe-password' }
        }, response)

        assert.equal(response.statusCode, 200)
        assert.equal(response.authCookie.name, 'token')
        assert.equal(response.authCookie.value, 'signed-token')
        assert.equal(response.authCookie.options.httpOnly, true)
        assert.equal(Object.hasOwn(response.body, 'token'), false)
    } finally {
        userModel.findOne = originalFindOne
        userModel.comparePassword = originalComparePassword
    }
})

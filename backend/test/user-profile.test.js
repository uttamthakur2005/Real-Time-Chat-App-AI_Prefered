const assert = require('node:assert/strict')
const test = require('node:test')
const userModel = require('../src/models/user.model')
const userController = require('../src/controllers/user.controller')

test('profile update changes the provided name without clearing the photo', async () => {
    const originalUpdate = userModel.findByIdAndUpdate
    let updateCall
    userModel.findByIdAndUpdate = (userId, updates, options) => {
        updateCall = { userId, updates, options }
        return {
            select: async () => ({
                _id: userId,
                name: updates.name,
                image: 'existing-photo'
            })
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
        await userController.updateProfile({
            body: { name: '  Asha  ' },
            user: { _id: 'user-id' },
            app: { get: () => null }
        }, response)

        assert.deepEqual(updateCall.updates, { name: 'Asha' })
        assert.equal(response.statusCode, 200)
        assert.equal(response.body.user.image, 'existing-photo')
        assert.equal(response.body.user.name, 'Asha')
    } finally {
        userModel.findByIdAndUpdate = originalUpdate
    }
})

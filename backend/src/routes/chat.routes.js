const express = require('express')
const authMiddleware = require('../middlewares/auth.middleware')
const chatController = require('../controllers/chat.controller')
const { applyRateLimit } = require('../middlewares/rate-limit.middleware')

const router = express.Router()

router.use(authMiddleware.userAuth)
router.get('/users', chatController.getUsers)
router.get('/ai/messages', chatController.getAIMessages)
router.post('/ai', applyRateLimit('ai'), chatController.askAI)
router.get('/:userId/messages', chatController.getMessages)

module.exports = router

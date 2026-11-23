const mongoose = require('mongoose')
const userModel = require('../models/user.model')
const messageModel = require('../models/message.model')
const aiExchangeModel = require('../models/ai-exchange.model')

const userPageSize = 50
const aiHistoryPageSize = 50

async function getUsers(req, res) {
    const page = req.query.page === undefined ? 1 : Number(req.query.page)
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    if (!Number.isInteger(page) || page < 1 || search.length > 80) {
        return res.status(400).json({ message: 'Invalid user list page or search.' })
    }

    const filter = { _id: { $ne: req.user._id } }
    if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const expression = new RegExp(escapedSearch, 'i')
        filter.$or = [{ userName: expression }, { email: expression }]
    }

    const users = await userModel
        .find(filter)
        .select('userName email image')
        .sort({ userName: 1 })
        .skip((page - 1) * userPageSize)
        .limit(userPageSize + 1)

    const presenceStore = req.app.get('presenceStore')
    const hasMore = users.length > userPageSize
    const usersWithPresence = await Promise.all(users.slice(0, userPageSize).map(async (user) => {
        const online = presenceStore
            ? await presenceStore.isOnline(String(user._id))
            : false
        return { ...user.toObject(), online }
    }))

    return res.json({
        users: usersWithPresence,
        hasMore,
        nextPage: hasMore ? page + 1 : null
    })
}

async function askAI(req, res) {
    const apiKey = process.env.GOOGLE_AI_KEY
    if (!apiKey) {
        return res.status(503).json({ message: 'AI chat is not configured on the server.' })
    }

    const { messages } = req.body
    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 20) {
        return res.status(400).json({ message: 'Send between 1 and 20 messages.' })
    }

    const validMessages = messages[0]?.role === 'user' &&
        messages.every((message, index) =>
        message &&
        ['user', 'model'].includes(message.role) &&
        (index === 0 || message.role !== messages[index - 1].role) &&
        typeof message.text === 'string' &&
        message.text.trim().length > 0 &&
        message.text.length <= 4000)

    if (!validMessages || messages[messages.length - 1].role !== 'user') {
        return res.status(400).json({ message: 'AI chat messages are invalid.' })
    }

    try {
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{ text: 'You are Vartam AI, a helpful and friendly assistant. Reply in the language used by the user.' }]
                    },
                    contents: messages.map(({ role, text }) => ({
                        role,
                        parts: [{ text: text.trim() }]
                    })),
                    generationConfig: { maxOutputTokens: 2048 }
                })
            }
        )
        const result = await response.json()

        if (!response.ok) {
            const providerMessage = result.error?.message
            console.error('Gemini request failed:', response.status, result.error?.status || 'unknown')
            return res.status(502).json({
                message: providerMessage
                    ? `Gemini error (${response.status}): ${providerMessage}`
                    : `Gemini request failed with status ${response.status}.`
            })
        }

        const answer = result.candidates?.[0]?.content?.parts
            ?.map((part) => part.text || '')
            .join('')
            .trim()

        if (!answer) {
            const finishReason = result.candidates?.[0]?.finishReason
            return res.status(502).json({
                message: `Gemini returned no text${finishReason ? ` (finish reason: ${finishReason})` : ''}.`
            })
        }

        let exchange
        try {
            exchange = await aiExchangeModel.create({
                user: req.user._id,
                prompt: messages[messages.length - 1].text.trim(),
                answer
            })
        } catch (error) {
            console.error('AI chat persistence failed:', error.message)
            return res.status(500).json({
                message: 'Gemini replied, but the conversation could not be saved.'
            })
        }

        return res.json({ answer, exchangeId: String(exchange._id) })
    } catch (error) {
        console.error('Gemini request failed:', error.message)
        return res.status(502).json({ message: 'Could not reach AI right now. Please try again.' })
    }
}

async function getAIMessages(req, res) {
    const filter = { user: req.user._id }
    if (req.query.before !== undefined) {
        if (!mongoose.isValidObjectId(req.query.before)) {
            return res.status(400).json({ message: 'Invalid AI history cursor.' })
        }
        filter._id = { $lt: new mongoose.Types.ObjectId(req.query.before) }
    }

    const exchanges = await aiExchangeModel
        .find(filter)
        .sort({ _id: -1 })
        .limit(aiHistoryPageSize + 1)
        .lean()

    const hasMore = exchanges.length > aiHistoryPageSize
    const page = exchanges.slice(0, aiHistoryPageSize).reverse()
    const messages = page.flatMap((exchange) => {
        const id = String(exchange._id)
        return [
            { id: `${id}-user`, role: 'user', text: exchange.prompt },
            { id: `${id}-model`, role: 'model', text: exchange.answer }
        ]
    })

    return res.json({
        messages,
        hasMore,
        nextCursor: hasMore ? String(page[0]._id) : null
    })
}

async function getMessages(req, res) {
    const { userId } = req.params

    if (!mongoose.isValidObjectId(userId)) {
        return res.status(400).json({ message: 'Invalid user' })
    }

    const messages = await messageModel.find({
        $or: [
            { sender: req.user._id, recipient: userId },
            { sender: userId, recipient: req.user._id }
        ]
    }).sort({ createdAt: -1 }).limit(100)

    return res.json({ messages: messages.reverse() })
}

module.exports = {
    getUsers,
    askAI,
    getAIMessages,
    getMessages
}

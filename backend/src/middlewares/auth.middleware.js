const jwt = require('jsonwebtoken')
const tokenBlacklistModel = require('../models/token-blacklist.model')
const { hashToken } = require('../utils/token')

async function userAuth (req, res, next) {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]

    if (!token) {
        return res.status(401).json({
            message: 'Unauthorized'
        })
    }

    let decoded
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
        return res.status(401).json({
            message: 'Invalid Token'
        })
    }

    if (await tokenBlacklistModel.exists({ tokenHash: hashToken(token) })) {
        return res.status(401).json({
            message: 'Invalid Token'
        })
    }

    req.user = decoded
    req.token = token
    next()
}

module.exports = {
    userAuth
}
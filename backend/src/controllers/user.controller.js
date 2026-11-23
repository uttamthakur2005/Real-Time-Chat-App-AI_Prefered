const userModel = require('../models/user.model')
const tokenBlacklistModel = require('../models/token-blacklist.model')
const { validationResult } = require('express-validator')
const { hashToken } = require('../utils/token')

const authCookieOptions = {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    secure: process.env.NODE_ENV === 'production'
}

function setAuthCookie(res, token) {
    res.cookie('token', token, { ...authCookieOptions, maxAge: 24 * 60 * 60 * 1000 })
}

async function userSignup(req, res) {

    const Errors = validationResult(req)

    if (!Errors.isEmpty()) {
        return res.status(400).json({ errors: Errors.array() })
    }

    try {

        const { userName, email, password, image } = req.body

        const alreadyExists = await userModel.findOne({
            $or: [{ email }, { userName }]
        })

        if (alreadyExists) {
            return res.status(400).json({
                message: 'User Already Exists'
            })
        }

        const hashedPassword = await userModel.bcryptPassword(password)

        const newUser = await userModel.create({
            userName,
            email,
            password: hashedPassword,
            image: image || ''
        })
        const token = newUser.GenerateJWT()
        const user = newUser.toObject()
        delete user.password

        setAuthCookie(res, token)

        return res.status(200).json({
            message: 'User Registered Successfully',
            newUser: user
        })

    } catch (err) {
        console.error('Signup failed:', err.message)
        res.status(500).json({
            message: 'Account could not be created.'
        })
    }
}

async function userLogin(req, res) {
    const Errors = validationResult(req)
    if (!Errors.isEmpty()) {
        return res.status(400).json({ errors: Errors.array() })
    }

    const { email, password } = req.body

    try {
        const user = await userModel.findOne({ email })

        if (!user) {
            return res.status(400).json({
                message: 'Invalid email or password'
            })
        }

        const isMatch = await userModel.comparePassword(password, user.password)

        if (!isMatch) {
            return res.status(400).json({
                message: 'Invalid email or password'
            })
        }

        const token = user.GenerateJWT()
        const userData = user.toObject()
        delete userData.password

        setAuthCookie(res, token)

        return res.status(200).json({
            message: 'Login Successful',
            user: userData
        })

    } catch (err) {
        console.error('Login failed:', err.message)
        res.status(500).json({
            message: 'Could not sign in right now.'
        })
    }
}

async function userLogout(req, res) {
    await tokenBlacklistModel.create({
        tokenHash: hashToken(req.token),
        expiresAt: new Date(req.user.exp * 1000)
    })

    req.app.get('io')?.in(String(req.user._id)).disconnectSockets(true)
    res.clearCookie('token', authCookieOptions)

    return res.status(200).json({
        message: 'Logout Successful'
    })
}

async function currentUser(req, res) {
    const user = await userModel.findById(req.user._id).select('-password')

    if (!user) {
        return res.status(401).json({ message: 'User Not Found' })
    }

    return res.status(200).json({ user })
}

async function updateProfile(req, res) {
    const Errors = validationResult(req)
    if (!Errors.isEmpty()) {
        return res.status(400).json({ errors: Errors.array() })
    }

    const updates = {}
    if (typeof req.body.image === 'string') updates.image = req.body.image
    if (typeof req.body.name === 'string') updates.name = req.body.name.trim()
    if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No profile details were provided.' })
    }

    const user = await userModel.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
    ).select('-password')

    if (!user) {
        return res.status(404).json({ message: 'User Not Found' })
    }

    req.app.get('io')?.emit('profile:update', {
        userId: String(user._id),
        image: user.image,
        name: user.name
    })
    return res.status(200).json({ user })
}

module.exports = {
    userSignup,
    userLogin,
    userLogout,
    currentUser,
    updateProfile
}
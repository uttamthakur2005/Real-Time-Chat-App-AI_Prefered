const express = require('express')
const userController = require('../controllers/user.controller')
const { body } = require('express-validator')
const authMiddleware = require('../middlewares/auth.middleware')
const { applyRateLimit } = require('../middlewares/rate-limit.middleware')

const router = express.Router()
const imageDataUrl = /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/
const profileImageValidator = body('image')
    .optional({ values: 'falsy' })
    .isString()
    .isLength({ max: 1400000 })
    .custom((image) => !image || imageDataUrl.test(image))
    .withMessage('Profile photo must be a JPEG, PNG, or WebP image under 1 MB')
const profileNameValidator = body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 60 })
    .withMessage('Name must be 60 characters or fewer')

router.post('/signup',
    applyRateLimit('auth'),
    body('userName').notEmpty().withMessage('User Name is required'),
    body('email').isEmail().withMessage('Valid Email is required'),
    body('password')
        .isString()
        .withMessage('Password must be text')
        .bail()
        .isLength({ min: 12 })
        .withMessage('Password must be at least 12 characters long')
        .bail()
        .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
        .withMessage('Password must be 72 UTF-8 bytes or fewer'),
    profileImageValidator,
    userController.userSignup)

router.post('/login',
    applyRateLimit('auth'),
    body('email').isEmail().withMessage('Valid Email is required'),
    body('password').isString().withMessage('Password is required').bail()
        .custom((password) => Buffer.byteLength(password, 'utf8') <= 72)
        .withMessage('Password must be 72 UTF-8 bytes or fewer'),
    userController.userLogin)

router.get('/me', authMiddleware.userAuth, userController.currentUser)
router.patch('/me', authMiddleware.userAuth, profileImageValidator, profileNameValidator, userController.updateProfile)
router.post('/logout', authMiddleware.userAuth, userController.userLogout)

module.exports = router
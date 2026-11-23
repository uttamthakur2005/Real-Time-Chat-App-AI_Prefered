const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')


const userSchema = new mongoose.Schema({

    name: {
        type: String,
        maxlength: 60
    },
    userName: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        default: "",
        maxlength: 1400000
    }

}, {
    timestamps: true
})

userSchema.statics.bcryptPassword = async function(password) {
    const hashedPassword = await bcrypt.hash(password, 10)
    return hashedPassword
}

userSchema.statics.comparePassword = async function(password, hashedPassword) {
    const isMatch = await bcrypt.compare(password, hashedPassword)
    return isMatch
}

userSchema.methods.GenerateJWT = function() {
    const secret = process.env.JWT_SECRET
    if (!secret) {
        throw new Error('JWT_SECRET is not configured')
    }

    const token = jwt.sign({ _id: this._id }, secret, { expiresIn: '24h' })
    return token
}

const userModel = mongoose.model('user', userSchema)

module.exports = userModel


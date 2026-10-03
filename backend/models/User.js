const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,   // no two users same email
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    passwordResetToken: {
        type: String,
        default: null
    },
    passwordResetExpires: {
        type: Date,
        default: null
    }
}, { timestamps: true })   // auto adds createdAt, updatedAt

// Never leak credentials when a user document is serialised
userSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password
        delete ret.passwordResetToken
        delete ret.passwordResetExpires
        delete ret.__v
        return ret
    }
})

module.exports = mongoose.model('User', userSchema)

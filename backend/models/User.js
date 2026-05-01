const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true   // no two users same email
    },
    password: {
        type: String,
        required: true
    }
}, { timestamps: true })   // auto adds createdAt, updatedAt

module.exports = mongoose.model('User', userSchema)
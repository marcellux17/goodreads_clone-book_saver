const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const validator = require('validator')
const userSchema = new mongoose.Schema({
    username: {
        type: String
    },
    email: {
        type: String,
        unique: true,
        validate: [validator.isEmail, 'incorrect email']
    },
    profilePic: {
        type: String
    },
    password: {
        type: String,
        minlength: [6, 'password has to be at least 6 characters long']
    },
    shelves: [{ name: { type: String }, books: [{ ref: 'Book', type: mongoose.Schema.Types.ObjectId }] }],
    reviewedBooks: [{type: mongoose.Schema.Types.ObjectId, ref: 'Book'}]
})

userSchema.virtual('books', {
    ref: 'Book',
    localField: '_id',
    foreignField: 'users'
})
userSchema.pre('save', async function (next) {
    const user = this
    if(!this.isModified('password'))return next()
    const salt = await bcrypt.genSalt(8)
    const hashedPassword = await bcrypt.hash(user.password, salt)
    user.password = hashedPassword
    next()
})
userSchema.statics.login = async function (email, password) {
    const user = await this.findOne({ email })
    if(!user)throw new Error('no user with that email is registered')
    const isvalid = await bcrypt.compare(password, user.password)
    if (!isvalid) throw new Error('invalid password')
    return user
}
const User = new mongoose.model('User', userSchema)

module.exports = User
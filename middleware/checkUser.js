const jwt = require('jsonwebtoken')
const User = require('../models/user')
const checkUser = async (req, res, next) => {
    try {
        if (!req.cookies.auth_token) {
            req.is_user = false
            return next()
        }
        const decodedToken = await jwt.verify(req.cookies.auth_token, process.env.JWT_SECRET_KEY)
        const user = await User.findById(decodedToken.id)
        if (!user) {
            req.is_user = false
            res.cookie('auth_token', '', {maxAge: 0})
            return next()
        }
        req.is_user = true
        req.user_id = user._id
        res.locals._user = user
        next()
    } catch (error) {
        req.is_user = false
        next()
    }
}
module.exports = checkUser
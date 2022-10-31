const express = require('express')
const fs = require('fs')
const sharp = require('sharp')
const User = require('../models/user')
const Book = require('../models/book')
const path = require('path')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose')

const maxAge = 7*24*60*60
const createAuthToken = (id) => {
    return jwt.sign({id}, process.env.JWT_SECRET_KEY, {expiresIn: maxAge})
}
const handleError = (error) => {
    let errors = {}
    if (error.message === "no user with that email is registered") {
        errors.email = error.message
        return errors
    }
    if (error.message === "invalid password") {
        errors.password = error.message
        return errors
    }
    if (error.code === 11000) {
        errors.email = 'that email is already registered'
    }
    if (error.name === "ValidationError") {
        Object.values(error.errors).forEach(({ properties }) => {
            errors[properties.path] = properties.message
        })
    }
    return errors
}
const login_get = async (req, res) => {
    if (req.is_user) return res.redirect('/')
    res.render('user/login',{email: '', password: '', errors: {}})
}
const login_post = async (req, res) => {
    const { email, password } = req.body
    try {
        const user = await User.login(email, password)
        const token = createAuthToken(user._id.toString())
        res.cookie('auth_token', token, { maxAge: maxAge * 1000 })
        res.redirect('/')
    } catch (error) {
        const errors = handleError(error)
        res.render('user/login', {email, password, errors})
    }
}
const signup_get = async (req, res) => {
    if(req.is_user)return res.redirect('/')
    res.render('user/signup', {user: new User(), errors: {}})
}
const signup_post = async (req, res) => {
    const { username, email, password } = req.body
    const profilePic = req.file
    const user = new User({ username, email, password, profilePic: profilePic.filename })
    try {
        const fileName = profilePic.filename
        const newFileName = fileName.replace(path.extname(fileName), '.png')
        const resizedPath = path.resolve(profilePic.destination,'resized', newFileName)
        user.profilePic = newFileName
        await user.save()
        await sharp(profilePic.path).resize({ height: 120, width: 100 }).png().toFile(resizedPath)
        fs.unlinkSync(profilePic.path)
        const token =  createAuthToken(user._id.toString())
        res.cookie('auth_token', token, { maxAge: maxAge * 1000 })
        res.redirect('/')
    } catch (error) {
        fs.unlinkSync(profilePic.path)
        const errors = handleError(error)
        res.render('user/signup', {user: new User({username, email, password}), errors})
    }
}
const profile_edit_get = async (req, res) => {
    if (!req.is_user) return res.redirect('/')
    const user = await User.findById(req.user_id)
    const success = req.cookies?.success === 'true'
    res.cookie('success', '', {maxAge: 0})
    res.render('user/profile_edit', {user, errors: {}, success})
}
const profile_view_get = async (req, res) => {
    if (!req.is_user) return res.redirect('/')
    const user = await User.findById(req.user_id)
    await user.populate('shelves.books').execPopulate()
    res.render('user/profile_view', { user, errors: { }})
}
const profile_patch = async (req, res) => {
    let errors = {}
    const { email, password_current, password_new, username } = req.body

    const checkUser = await User.findOne({ email })
    const decodedToken = await jwt.verify(req.cookies.auth_token, process.env.JWT_SECRET_KEY)
    const user = await User.findById(decodedToken.id)
    const profilePic = req.file
    if (checkUser && checkUser._id.toString() !== user._id.toString()) {
        res.locals._user = user
        errors.email = 'that email already exists'
        return res.render('user/profile_edit', { user, errors, success: false })
    }
    const isvalid = await bcrypt.compare(password_current, user.password)
    if (!isvalid) {
        res.locals._user = user
        errors.password = "passwords don't match"
        return res.render('user/profile_edit', { user, errors, success: false })
    }
    if (password_new) {
        user.password = password_new
    }
    user.email = email
    user.username = username
    if (profilePic) {
        const fileName = profilePic.filename
        const newFileName = fileName.replace(path.extname(fileName), '.png')
        const resizedPath = path.resolve(profilePic.destination, 'resized', newFileName)
        fs.unlinkSync(`./public/images/profile/resized/${user.profilePic}`)
        user.profilePic = newFileName
        await sharp(profilePic.path).resize({ height: 120, width: 100 }).png().toFile(resizedPath)
        fs.unlinkSync(profilePic.path)
    }
    try {
        await user.save()
        res.cookie('success', true)
        res.redirect('/user/profile_edit')
    } catch (error) {
        errors = handleError(error)
        if (errors.password) {
            errors.newpassword = errors.password
            delete errors.password
        }
        res.render('user/profile_edit', { user, errors, success: false })
    }
}
const logout = (req, res) => {
    res.cookie('auth_token', '', { maxAge: 0 })
    res.redirect('/')
}
const profile_delete = async (req, res) => {
    const decodedToken = await jwt.verify(req.cookies.auth_token, process.env.JWT_SECRET_KEY)
    const user = await User.findById(decodedToken.id)
    res.locals._user = user
    const isvalid = await bcrypt.compare(req.body.password, user.password)
    await user.populate('shelves.books').execPopulate()
    if (!isvalid) return res.render('user/profile_view', { user, errors: { password: true } })
    try {
        fs.unlinkSync(`./public/images/profile/resized/${user.profilePic}`)
        await user.populate('reviewedBooks').execPopulate()
        user.reviewedBooks.forEach(async b => {
            await Book.updateOne({_id: b._id}, {$pull: {reviews: {reviewer: user._id}}})
        })
        await User.findByIdAndDelete(user._id)
        res.cookie('auth_token', '', { maxAge: 0 })
        res.redirect('/')
    } catch (error) {
        res.locals._user = user
        res.render('user/profile_view', { user, errors: { password: true } })
    }
}
const add_book = async (req, res) => {
    const book = await Book.findById(req.params.id)
    if (!book) return redirect(`/books/${req.params.id}`)
    const decodedToken = await jwt.verify(req.cookies.auth_token, process.env.JWT_SECRET_KEY)
    const user = await User.findById(decodedToken.id)
    const shelf = user.shelves.find(s => s.name === req.body.shelf)
    if (shelf.books.includes(book._id)) {
        return res.redirect(`/books/${book._id}`)
    }
    shelf.books.push(book._id)
    await user.save()
    res.redirect(`/books/${book._id}`)
}
const add_shelf = async (req, res) => {
    const decodedToken = await jwt.verify(req.cookies.auth_token, process.env.JWT_SECRET_KEY)
    const shelf = req.body.shelf
    const user = await User.findById(decodedToken.id)
    if (user.shelves.some(s => s.name === shelf)) {
        return res.render('user/profile_view', {user, errors: {shelf: 'shelf already exists'}})
    }
    user.shelves.push({ name: shelf })
    await user.save()
    res.redirect('/user/profile_view')
}
const delete_shelf = async (req, res) => {
    const decodedToken = await jwt.verify(req.cookies.auth_token, process.env.JWT_SECRET_KEY)
    const user = await User.findById(decodedToken.id)
    const shelfId = req.params.id
    user.shelves.pull({ _id: shelfId })
    await user.save()
    res.redirect('/user/profile_view')
}
const delete_bookFromShelf = async (req, res) => {
    const shelfId = req.query.shelfId
    const bookId = req.query.bookId
    const decodedToken = await jwt.verify(req.cookies.auth_token, process.env.JWT_SECRET_KEY)
    const user = await User.findById(decodedToken.id)
    const shelf = user.shelves.find(s => s._id.toString() === shelfId.toString())
    shelf.books.pull({_id: bookId})
    await user.save()
    res.redirect('/user/profile_view')
}
module.exports = { login_post, login_get, signup_get, signup_post, profile_edit_get, profile_view_get, profile_patch, logout, profile_delete, add_shelf, add_book, delete_shelf, delete_bookFromShelf }

const express = require('mongoose')
const { Router } = require('express')
const User =  require('../models/user')
const {login_post, login_get, signup_get, signup_post, profile_edit_get, profile_view_get, profile_patch, logout, profile_delete, add_shelf, add_book, delete_shelf, delete_bookFromShelf} = require('../controllers/user')
const createUpload = require('./helpers/upload')
const userRouter = new Router()

const imageUpload = createUpload('profilepic', './public/images/profile/')
userRouter.get('/login', login_get)
userRouter.post('/login', login_post)
userRouter.get('/signup', signup_get)
userRouter.post('/signup', imageUpload, signup_post, (err, req, res, next) => {
    const { email, username, password } = req.body
    const user = new User({email, username, password})
    const msg = err.message.toLowerCase()
    res.render('user/signup', {user, errors: {file: msg}})
})
userRouter.get('/profile_view', profile_view_get)
userRouter.get('/profile_edit', profile_edit_get)
userRouter.patch('/profile', imageUpload, profile_patch, (err, req, res, next) => {
    const { email, username, password_new } = req.body
    const user = new User({email, username, password: password_new})
    const msg = err.message.toLowerCase()
    res.render('user/profile_edit', {user, errors: {file: msg}})
})
userRouter.delete('/', profile_delete)
userRouter.get('/logout', logout)
userRouter.post('/add_shelf', add_shelf)
userRouter.post('/add_book/:id', add_book)
userRouter.delete('/delete_shelf/:id', delete_shelf)
userRouter.delete('/delete_book', delete_bookFromShelf)

module.exports = userRouter
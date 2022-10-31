const express = require('express')
const Book = require('../models/book')
const mongoose = require('mongoose')
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const User = require('../models/user')
const jwt = require('jsonwebtoken')

const books_get = async (req, res) => {
    const books = await Book.find()
    books.forEach(b => {
        b.populate('reviews.reviewer').execPopulate()
    })
    res.render('book/books', {books})
}
const books_create_get = (req, res) => {
    if (!req.is_user) return res.redirect('/user/login')
    res.render('book/book_add', {book: new Book(), errors: false})
}
const book_post = async (req, res) => {
    const { author, title, description } = req.body
    const cover = req.file
    const book = new Book({ author, title, description, cover: cover.filename })
    try {
        const fileName = cover.filename
        const newFileName = fileName.replace(path.extname(fileName), '.png')
        const resizedPath = path.resolve(cover.destination,'resized', newFileName)
        book.cover = newFileName
        await book.save()
        await sharp(cover.path).resize({ height: 180, width: 150 }).png().toFile(resizedPath)
        fs.unlinkSync(cover.path)
        res.redirect(`/books/${book._id.toString()}`)
    } catch (error) {
        console.log(error)
        fs.unlinkSync(cover.path)
        res.render('book/book_add', {book, errors: true})
    }
}
const book_show = async (req, res) => {
    const book = await Book.findById(mongoose.Types.ObjectId(req.params.id))
    if (!book) return redirect('/')
    if (req.user_id && !book.reviews.some(review => review.reviewer.equals(req.user_id))) {
        res.locals.is_review = true
    }
    await book.populate('reviews.reviewer').execPopulate()
    res.render('book/book_show', {book})
}
const books_review_post = async (req, res) => {
    const book = await Book.findById(req.params.id)
    const decodedToken = await jwt.verify(req.cookies.auth_token, process.env.JWT_SECRET_KEY)
    const user = await User.findById(decodedToken.id)
    user.reviewedBooks.push(book._id)
    await user.save()
    book.reviews.push({ rating: parseInt(req.body.rating), review: req.body.review.trim() === "" ? "This user did not provide a review text" : req.body.review, reviewer: user._id })
    await book.save()
    res.redirect(`/books/${book._id}`)
}
module.exports = { books_get, books_create_get, book_post, book_show, books_review_post }
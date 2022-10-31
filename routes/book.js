const express = require('express')
const { Router } = require('express')
const Book = require('../models/book')
const { books_get, books_create_get, book_post,  book_show, books_review_post} = require('../controllers/book')
const createUpload = require('./helpers/upload')

const imageUpload = createUpload('cover', './public/images/books')
const booksRouter = new Router()

booksRouter.post('/', imageUpload, book_post, (err, req, res, next) => {
    const { title, author, description } = req.body
    const book = new Book({title, author, description})
    const msg = err.message.toLowerCase()
    res.render('book/book_add', {book, errors: {file: msg}})
})
booksRouter.get('/create', books_create_get)
booksRouter.get('/:id', book_show)
booksRouter.get('/', books_get)
booksRouter.post('/review/:id', books_review_post)

module.exports = booksRouter 
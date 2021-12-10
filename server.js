const express = require('express')
const mongoose = require('mongoose')
const cookieParser = require('cookie-parser')
const methodOverride = require('method-override')
const checkUser = require('./middleware/checkUser')
const cors = require('cors')
require('dotenv').config()

const userRouter = require('./routes/user')
const booksRouter = require('./routes/book')

const app = express()
const PORT = process.env.PORT
const DB_URL = process.env.DB_URL

app.set('view engine', 'ejs')
app.set('views', './views')


//for testing purposes
app.use(cors({origin: '*'}))

app.use(express.urlencoded({extended: true}))
app.use(express.static('./public'))
app.use(cookieParser())
app.use(methodOverride('_method'))

app.get('*', checkUser)
app.use('/user', userRouter)
app.use('/books', booksRouter)
app.get('/', (req, res) => {
    res.render('index')
})
app.get('*', (req, res) => {
    res.render('404')
})

mongoose.connect(DB_URL).then(res => {
    app.listen(PORT, () => {
        console.log('app listening on port', PORT)
    })
}).catch(e => {
    console.log(e)
})
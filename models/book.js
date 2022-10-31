/** @format */

const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
    title: {
        type: String,
    },
    description: {
        type: String,
    },
    author: {
        type: String,
    },
    cover: {
        type: String,
    },
    reviews: [
        {
            rating: { type: Number },
            review: { type: String },
            reviewer: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            createdAt: { type: Date, default: Date.now }
        }
    ]
});
bookSchema.virtual('averageRating').get(function () {
    if(this.reviews.length === 0)return 'no reviews'
    const total = this.reviews.reduce((acc, curr) => acc + curr.rating, 0)
    return Math.round((total / this.reviews.length)*2) / 2

})
const Book = new mongoose.model("Book", bookSchema);
module.exports = Book;

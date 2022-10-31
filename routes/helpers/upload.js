const multer = require('multer')
const path = require('path')
//sharp considers the destination relative to the folder of the project
const createUpload = (fieldname, destination) => {
    const storage = multer.diskStorage({
        destination,
        filename(req, file, cb) {
            cb(null, file.originalname.replace(path.extname(file.originalname), '') + '-' + Date.now()+ path.extname(file.originalname))
        }
    })
    const upload = multer({
        limits: {
            fileSize: 1500000
        },
        fileFilter(req, file, cb) {
            const imageRegex = new RegExp('jpg|jpeg|png|gif')
            if (imageRegex.test(path.extname(file.originalname)) && imageRegex.test(file.mimetype)) {
                cb(null, true)
            } else {
                cb(new Error('you can only upload images'), false)
            }
        },
        storage
    }).single(fieldname)
    return upload
}

module.exports = createUpload
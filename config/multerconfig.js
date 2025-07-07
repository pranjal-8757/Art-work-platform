// multerconfig.js (new Cloudinary version)
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary'); // the cloudinary.js you created with config()

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'art_gallery', // optional folder in Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png'], // file types allowed
  },
});

const upload = multer({ storage });

module.exports = upload;

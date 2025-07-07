// routes/artworkRoutes.js
const express = require('express');
const upload = require('../multerconfig'); // Cloudinary-based config
const Artwork = require('../models/Artwork');

const router = express.Router();

router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const { title } = req.body;
    const imageUrl = req.file.path; // Cloudinary URL

    const newArtwork = new Artwork({
      title,
      imageUrl,
    });

    await newArtwork.save();
    res.status(201).json({ message: 'Artwork uploaded successfully', artwork: newArtwork });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const { getProfile, updateProfile, uploadProfileImage } = require('../controllers/profileController');

/**
 * Multer Configuration for Profile Image Upload
 * 
 * multer is a middleware that handles multipart/form-data (file uploads).
 * 
 * storage: Defines WHERE and HOW to store uploaded files
 * - destination: folder to save files
 * - filename: how to name the saved file (we add timestamp to avoid name conflicts)
 * 
 * fileFilter: Validates file type (only allow images)
 * limits: Max file size (5MB)
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        // Create unique filename: userId-timestamp.extension
        const uniqueName = `profile-${req.userId}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter - only allow image files
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);  // Accept the file
    } else {
        cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024  // 5MB max file size
    }
});

// All profile routes are protected (require auth middleware)

// GET /api/profile - Get current user's profile
router.get('/', auth, getProfile);

// PUT /api/profile - Update current user's profile
router.put('/', auth, updateProfile);

// POST /api/profile/upload-image - Upload profile picture
// 'profile_image' is the field name in the form
router.post('/upload-image', auth, upload.single('profile_image'), (err, req, res, next) => {
    // Handle multer errors (file too large, wrong type, etc.)
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File is too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: err.message
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
}, uploadProfileImage);

module.exports = router;

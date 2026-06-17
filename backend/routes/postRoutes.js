const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const { 
    createPost, getAllPosts, getPostById, deletePost,
    likePost, unlikePost, addComment, getComments
} = require('../controllers/postController');

/**
 * Multer Configuration for Post Image Upload
 * 
 * Same concept as profile image upload, but with different filename pattern.
 * 
 * Key differences from profile upload:
 * - Filename prefix is "post-" instead of "profile-"
 * - We include the user ID AND a timestamp to ensure uniqueness
 * - Same file type validation (only images allowed)
 * - Same 5MB size limit
 */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        // Create unique filename: post-userId-timestamp.extension
        // Example: post-3-1717789200000.jpg
        const uniqueName = `post-${req.userId}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter - only allow image files (same as profile routes)
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

// =============================================
// POST ROUTES
// =============================================

/**
 * POST /api/posts - Create a new post
 * 
 * Protected (requires auth middleware)
 * Uses multer to handle optional image upload
 * The field name 'post_image' must match what the frontend sends
 * 
 * Flow:
 * 1. auth middleware verifies JWT token → sets req.userId
 * 2. multer middleware processes uploaded file (if any) → sets req.file
 * 3. createPost controller saves post to database
 */
router.post('/', auth, upload.single('post_image'), (err, req, res, next) => {
    // Handle multer errors (file too large, wrong type, etc.)
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'Image is too large. Maximum size is 5MB.'
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
}, createPost);

/**
 * GET /api/posts - Get all posts (Feed)
 * 
 * Public route, but uses optionalAuth to identify logged-in users
 * Returns posts sorted by newest first with author info, like/comment counts
 */
router.get('/', optionalAuth, getAllPosts);

/**
 * GET /api/posts/:id - Get a single post
 * 
 * Public route with optionalAuth
 * :id is a URL parameter (e.g., /api/posts/5)
 */
router.get('/:id', optionalAuth, getPostById);

/**
 * DELETE /api/posts/:id - Delete a post
 * 
 * Protected (requires auth)
 * Only the post owner can delete their own post
 */
router.delete('/:id', auth, deletePost);

// =============================================
// LIKE ROUTES
// =============================================

/**
 * POST /api/posts/:id/like - Like a post
 */
router.post('/:id/like', auth, likePost);

/**
 * DELETE /api/posts/:id/unlike - Unlike a post
 */
router.delete('/:id/unlike', auth, unlikePost);

// =============================================
// COMMENT ROUTES
// =============================================

/**
 * POST /api/posts/:id/comment - Add a comment
 */
router.post('/:id/comment', auth, addComment);

/**
 * GET /api/posts/:id/comments - Get all comments for a post
 */
router.get('/:id/comments', getComments);

module.exports = router;

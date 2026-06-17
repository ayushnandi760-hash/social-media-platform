const db = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * CREATE a new post
 * POST /api/posts
 * 
 * Protected route - requires JWT token
 * Accepts: content (text), optional image (file upload via multer)
 * 
 * How it works:
 * 1. User writes some text content (required)
 * 2. User can optionally attach an image
 * 3. multer middleware processes the image BEFORE this function runs
 * 4. We save the post to the database with the user's ID
 */
const createPost = async (req, res) => {
    try {
        const { content } = req.body;
        const userId = req.userId; // Set by auth middleware

        // --- Validation ---
        if (!content || !content.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Post content is required. Write something!'
            });
        }

        if (content.length > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Post content must be under 5000 characters.'
            });
        }

        // Check if an image was uploaded (multer sets req.file)
        // If user uploaded an image, req.file.filename has the saved filename
        // If no image, image_url will be null in the database
        const imageUrl = req.file ? req.file.filename : null;

        // --- Insert into database ---
        const [result] = await db.query(
            'INSERT INTO posts (user_id, content, image_url) VALUES (?, ?, ?)',
            [userId, content.trim(), imageUrl]
        );

        // Fetch the newly created post with user info
        // We JOIN with users table to get the author's name and profile picture
        const [posts] = await db.query(
            `SELECT 
                p.id, 
                p.user_id, 
                p.content, 
                p.image_url, 
                p.created_at,
                u.name AS author_name,
                u.profile_image AS author_avatar
             FROM posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.id = ?`,
            [result.insertId]
        );

        res.status(201).json({
            success: true,
            message: 'Post created successfully! 🎉',
            post: posts[0]
        });

    } catch (error) {
        console.error('Create post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while creating post.'
        });
    }
};

/**
 * GET all posts (Feed)
 * GET /api/posts
 * 
 * Public route (no auth required to view feed)
 * Returns all posts sorted by newest first
 * 
 * How the JOIN works:
 * - We need to show the author's name and profile picture with each post
 * - Posts table only stores user_id (a number)
 * - We JOIN with users table to "look up" the user's name and avatar
 * - Think of it like: "For each post, go find the matching user and grab their info"
 * 
 * Query breakdown:
 *   SELECT p.*, u.name, u.profile_image   <-- What columns we want
 *   FROM posts p                            <-- Main table (aliased as "p")
 *   JOIN users u                            <-- Also look in users table (aliased as "u")
 *   ON p.user_id = u.id                     <-- Match condition: post's user_id = user's id
 *   ORDER BY p.created_at DESC              <-- Newest posts first
 */
const getAllPosts = async (req, res) => {
    try {
        const userId = req.userId || 0; // From optionalAuth middleware
        
        const [posts] = await db.query(
            `SELECT 
                p.id, 
                p.user_id, 
                p.content, 
                p.image_url, 
                p.created_at,
                u.name AS author_name,
                u.profile_image AS author_avatar,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
                (SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = ?) AS has_liked
             FROM posts p
             JOIN users u ON p.user_id = u.id
             ORDER BY p.created_at DESC`,
             [userId]
        );

        res.status(200).json({
            success: true,
            count: posts.length,
            posts
        });

    } catch (error) {
        console.error('Get all posts error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching posts.'
        });
    }
};

/**
 * GET a single post by ID
 * GET /api/posts/:id
 * 
 * Public route
 * The :id in the URL becomes req.params.id
 * Example: GET /api/posts/5 → req.params.id = "5"
 */
const getPostById = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId || 0;

        const [posts] = await db.query(
            `SELECT 
                p.id, 
                p.user_id, 
                p.content, 
                p.image_url, 
                p.created_at,
                u.name AS author_name,
                u.profile_image AS author_avatar,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
                (SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = ?) AS has_liked
             FROM posts p
             JOIN users u ON p.user_id = u.id
             WHERE p.id = ?`,
            [userId, postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Post not found.'
            });
        }

        res.status(200).json({
            success: true,
            post: posts[0]
        });

    } catch (error) {
        console.error('Get post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching post.'
        });
    }
};

/**
 * DELETE a post
 * DELETE /api/posts/:id
 * 
 * Protected route - requires JWT token
 * IMPORTANT: Only the post owner can delete their own post
 * 
 * Security check:
 * 1. Find the post
 * 2. Check if the logged-in user (req.userId) is the post owner (post.user_id)
 * 3. If not, return 403 Forbidden
 * 4. If yes, delete the post image file (if any) and then delete from database
 */
const deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId;

        // Step 1: Find the post
        const [posts] = await db.query(
            'SELECT * FROM posts WHERE id = ?',
            [postId]
        );

        if (posts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Post not found.'
            });
        }

        const post = posts[0];

        // Step 2: Check ownership
        if (post.user_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own posts.'
            });
        }

        // Step 3: Delete the post image file from disk (if it has one)
        if (post.image_url) {
            const imagePath = path.join(__dirname, '..', 'uploads', post.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        // Step 4: Delete from database
        await db.query('DELETE FROM posts WHERE id = ?', [postId]);

        res.status(200).json({
            success: true,
            message: 'Post deleted successfully.'
        });

    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while deleting post.'
        });
    }
};

/**
 * ========================================
 * PHASE 3: LIKES & COMMENTS
 * ========================================
 */

/**
 * LIKE a post
 * POST /api/posts/:id/like
 * Protected route
 */
const likePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId;

        // Verify post exists
        const [posts] = await db.query('SELECT id FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        // Try to insert like (will fail if already liked due to UNIQUE constraint)
        try {
            await db.query('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
            res.status(200).json({ success: true, message: 'Post liked successfully.' });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'You already liked this post.' });
            }
            throw error;
        }
    } catch (error) {
        console.error('Like post error:', error);
        res.status(500).json({ success: false, message: 'Server error while liking post.' });
    }
};

/**
 * UNLIKE a post
 * DELETE /api/posts/:id/unlike
 * Protected route
 */
const unlikePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId;

        const [result] = await db.query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
        
        if (result.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'You have not liked this post yet.' });
        }

        res.status(200).json({ success: true, message: 'Post unliked successfully.' });
    } catch (error) {
        console.error('Unlike post error:', error);
        res.status(500).json({ success: false, message: 'Server error while unliking post.' });
    }
};

/**
 * ADD a comment
 * POST /api/posts/:id/comment
 * Protected route
 */
const addComment = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.userId;
        const { comment } = req.body;

        if (!comment || !comment.trim()) {
            return res.status(400).json({ success: false, message: 'Comment cannot be empty.' });
        }

        // Verify post exists
        const [posts] = await db.query('SELECT id FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        const [result] = await db.query(
            'INSERT INTO comments (post_id, user_id, comment) VALUES (?, ?, ?)',
            [postId, userId, comment.trim()]
        );

        // Fetch the inserted comment with author info
        const [comments] = await db.query(
            `SELECT c.*, u.name AS author_name, u.profile_image AS author_avatar
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.id = ?`,
            [result.insertId]
        );

        res.status(201).json({ success: true, message: 'Comment added.', comment: comments[0] });
    } catch (error) {
        console.error('Add comment error:', error);
        res.status(500).json({ success: false, message: 'Server error while adding comment.' });
    }
};

/**
 * GET comments for a post
 * GET /api/posts/:id/comments
 * Public route
 */
const getComments = async (req, res) => {
    try {
        const postId = req.params.id;

        const [comments] = await db.query(
            `SELECT c.*, u.name AS author_name, u.profile_image AS author_avatar
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.post_id = ?
             ORDER BY c.created_at ASC`,
            [postId]
        );

        res.status(200).json({ success: true, comments });
    } catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching comments.' });
    }
};

module.exports = { 
    createPost, getAllPosts, getPostById, deletePost,
    likePost, unlikePost, addComment, getComments
};

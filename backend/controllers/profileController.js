const db = require('../config/db');
const path = require('path');
const fs = require('fs');

/**
 * GET user profile
 * GET /api/profile
 * 
 * Protected route - requires JWT token
 * Uses req.userId set by auth middleware
 */
const getProfile = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT id, name, email, bio, profile_image, created_at FROM users WHERE id = ?',
            [req.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        const user = users[0];

        // Get counts for Quick Stats
        const [[{ posts_count }]] = await db.query('SELECT COUNT(*) AS posts_count FROM posts WHERE user_id = ?', [req.userId]);
        const [[{ followers_count }]] = await db.query('SELECT COUNT(*) AS followers_count FROM followers WHERE following_id = ?', [req.userId]);
        const [[{ following_count }]] = await db.query('SELECT COUNT(*) AS following_count FROM followers WHERE follower_id = ?', [req.userId]);

        res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                bio: user.bio,
                profile_image: user.profile_image,
                created_at: user.created_at,
                posts_count,
                followers_count,
                following_count
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching profile.'
        });
    }
};

/**
 * UPDATE user profile
 * PUT /api/profile
 * 
 * Protected route - requires JWT token
 * Allows updating name, email, and bio
 */
const updateProfile = async (req, res) => {
    try {
        const { name, email, bio } = req.body;

        // --- Validation ---
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required.'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email address.'
            });
        }

        // Check if email is taken by another user
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, req.userId]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'This email is already taken by another user.'
            });
        }

        // --- Update the profile ---
        await db.query(
            'UPDATE users SET name = ?, email = ?, bio = ? WHERE id = ?',
            [name, email, bio || null, req.userId]
        );

        // Fetch updated user
        const [updatedUsers] = await db.query(
            'SELECT id, name, email, bio, profile_image, created_at FROM users WHERE id = ?',
            [req.userId]
        );

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully!',
            user: updatedUsers[0]
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while updating profile.'
        });
    }
};

/**
 * UPLOAD profile image
 * POST /api/profile/upload-image
 * 
 * Protected route - requires JWT token
 * Uses multer middleware for file handling
 */
const uploadProfileImage = async (req, res) => {
    try {
        // multer middleware has already processed the file
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Please select an image to upload.'
            });
        }

        const imageFilename = req.file.filename;

        // Get current profile image to delete old one
        const [users] = await db.query(
            'SELECT profile_image FROM users WHERE id = ?',
            [req.userId]
        );

        // Delete old profile image (if it's not the default)
        if (users[0] && users[0].profile_image && users[0].profile_image !== 'default-avatar.png') {
            const oldImagePath = path.join(__dirname, '..', 'uploads', users[0].profile_image);
            if (fs.existsSync(oldImagePath)) {
                fs.unlinkSync(oldImagePath);
            }
        }

        // Update database with new image filename
        await db.query(
            'UPDATE users SET profile_image = ? WHERE id = ?',
            [imageFilename, req.userId]
        );

        res.status(200).json({
            success: true,
            message: 'Profile image uploaded successfully!',
            profile_image: imageFilename
        });

    } catch (error) {
        console.error('Upload image error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while uploading image.'
        });
    }
};

module.exports = { getProfile, updateProfile, uploadProfileImage };

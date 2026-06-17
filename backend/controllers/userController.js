const db = require('../config/db');

/**
 * GET user profile by ID
 * GET /api/users/:id
 * 
 * Public route (optionalAuth used to check if the current user is following)
 */
const getUserProfile = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const currentUserId = req.userId || 0; // from optionalAuth

        // Get user basic info
        const [users] = await db.query(
            'SELECT id, name, bio, profile_image, created_at FROM users WHERE id = ?',
            [targetUserId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = users[0];

        // Get counts: Posts, Followers, Following, and Is Following
        const [[{ posts_count }]] = await db.query('SELECT COUNT(*) AS posts_count FROM posts WHERE user_id = ?', [targetUserId]);
        const [[{ followers_count }]] = await db.query('SELECT COUNT(*) AS followers_count FROM followers WHERE following_id = ?', [targetUserId]);
        const [[{ following_count }]] = await db.query('SELECT COUNT(*) AS following_count FROM followers WHERE follower_id = ?', [targetUserId]);
        
        const [[{ is_following }]] = await db.query(
            'SELECT COUNT(*) AS is_following FROM followers WHERE follower_id = ? AND following_id = ?', 
            [currentUserId, targetUserId]
        );

        res.status(200).json({
            success: true,
            user: {
                ...user,
                posts_count,
                followers_count,
                following_count,
                is_following: is_following > 0
            }
        });

    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching user profile.' });
    }
};

/**
 * FOLLOW a user
 * POST /api/users/:id/follow
 * Protected route
 */
const followUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const currentUserId = req.userId;

        if (targetUserId == currentUserId) {
            return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
        }

        // Check if user exists
        const [users] = await db.query('SELECT id FROM users WHERE id = ?', [targetUserId]);
        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        try {
            await db.query('INSERT INTO followers (follower_id, following_id) VALUES (?, ?)', [currentUserId, targetUserId]);
            res.status(200).json({ success: true, message: 'Successfully followed user.' });
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ success: false, message: 'You are already following this user.' });
            }
            throw error;
        }

    } catch (error) {
        console.error('Follow error:', error);
        res.status(500).json({ success: false, message: 'Server error while following user.' });
    }
};

/**
 * UNFOLLOW a user
 * DELETE /api/users/:id/unfollow
 * Protected route
 */
const unfollowUser = async (req, res) => {
    try {
        const targetUserId = req.params.id;
        const currentUserId = req.userId;

        const [result] = await db.query(
            'DELETE FROM followers WHERE follower_id = ? AND following_id = ?', 
            [currentUserId, targetUserId]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'You are not following this user.' });
        }

        res.status(200).json({ success: true, message: 'Successfully unfollowed user.' });

    } catch (error) {
        console.error('Unfollow error:', error);
        res.status(500).json({ success: false, message: 'Server error while unfollowing user.' });
    }
};

/**
 * GET followers of a user
 * GET /api/users/:id/followers
 * Public route
 */
const getFollowers = async (req, res) => {
    try {
        const targetUserId = req.params.id;

        const [followers] = await db.query(
            `SELECT u.id, u.name, u.profile_image 
             FROM followers f
             JOIN users u ON f.follower_id = u.id
             WHERE f.following_id = ?
             ORDER BY f.created_at DESC`,
            [targetUserId]
        );

        res.status(200).json({ success: true, followers });

    } catch (error) {
        console.error('Get followers error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching followers.' });
    }
};

/**
 * GET users followed by a user (Following list)
 * GET /api/users/:id/following
 * Public route
 */
const getFollowing = async (req, res) => {
    try {
        const targetUserId = req.params.id;

        const [following] = await db.query(
            `SELECT u.id, u.name, u.profile_image 
             FROM followers f
             JOIN users u ON f.following_id = u.id
             WHERE f.follower_id = ?
             ORDER BY f.created_at DESC`,
            [targetUserId]
        );

        res.status(200).json({ success: true, following });

    } catch (error) {
        console.error('Get following error:', error);
        res.status(500).json({ success: false, message: 'Server error while fetching following list.' });
    }
};

module.exports = { getUserProfile, followUser, unfollowUser, getFollowers, getFollowing };

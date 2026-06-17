const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const { 
    getUserProfile, 
    followUser, 
    unfollowUser, 
    getFollowers, 
    getFollowing 
} = require('../controllers/userController');

/**
 * GET /api/users/:id - Get a specific user's profile
 * Public route with optionalAuth to check is_following
 */
router.get('/:id', optionalAuth, getUserProfile);

/**
 * POST /api/users/:id/follow - Follow a user
 * Protected route
 */
router.post('/:id/follow', auth, followUser);

/**
 * DELETE /api/users/:id/unfollow - Unfollow a user
 * Protected route
 */
router.delete('/:id/unfollow', auth, unfollowUser);

/**
 * GET /api/users/:id/followers - Get users following this user
 * Public route
 */
router.get('/:id/followers', getFollowers);

/**
 * GET /api/users/:id/following - Get users this user is following
 * Public route
 */
router.get('/:id/following', getFollowing);

module.exports = router;

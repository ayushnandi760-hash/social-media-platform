const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Optional Authentication Middleware
 * ----------------------------------
 * This middleware checks if a JWT token is present in the request.
 * If it is, it decodes it and attaches the `req.userId`.
 * If it isn't (or is invalid), it simply proceeds to the next function
 * WITHOUT throwing an error.
 * 
 * This is useful for public routes (like a feed) where we want to know
 * if a user is logged in (e.g., to see if they liked a post), but we
 * still want to allow guests to see the page.
 */
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        // If no token provided, just continue without setting req.userId
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        
        // Try to verify token. If it fails, the catch block will swallow the error and call next()
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;

        next();
    } catch (error) {
        // Token is invalid or expired, but since it's optional auth, we just continue
        next();
    }
};

module.exports = optionalAuth;

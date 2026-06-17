const jwt = require('jsonwebtoken');
require('dotenv').config();

/**
 * Authentication Middleware
 * --------------------------
 * This middleware checks if the incoming request has a valid JWT token.
 * It protects routes that require the user to be logged in.
 * 
 * Flow:
 * 1. Extract token from the "Authorization" header
 * 2. Verify the token using the secret key
 * 3. Attach the user's id to the request object
 * 4. Call next() to proceed to the actual route handler
 */
const auth = (req, res, next) => {
    try {
        // Step 1: Get the Authorization header
        const authHeader = req.headers.authorization;

        // Check if the header exists and starts with "Bearer "
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Access denied. No token provided. Please login first.'
            });
        }

        // Step 2: Extract the token (remove "Bearer " prefix)
        const token = authHeader.split(' ')[1];

        // Step 3: Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Step 4: Attach user id to request for use in route handlers
        req.userId = decoded.userId;

        // Step 5: Continue to the next middleware/route handler
        next();
    } catch (error) {
        // Token is invalid or expired
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.'
            });
        }
        return res.status(401).json({
            success: false,
            message: 'Invalid token. Please login again.'
        });
    }
};

module.exports = auth;

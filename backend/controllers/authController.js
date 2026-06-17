const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

/**
 * REGISTER a new user
 * POST /api/auth/register
 * 
 * Flow:
 * 1. Get name, email, password from request body
 * 2. Check if email already exists
 * 3. Hash the password using bcrypt
 * 4. Save user to database
 * 5. Generate JWT token
 * 6. Send token back to client
 */
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // --- Validation ---
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password.'
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

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        // --- Check if user already exists ---
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'An account with this email already exists.'
            });
        }

        // --- Hash the password ---
        // Salt rounds = 10 (higher = more secure but slower)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // --- Insert user into database ---
        const [result] = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        // --- Generate JWT Token ---
        const token = jwt.sign(
            { userId: result.insertId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // --- Send success response ---
        res.status(201).json({
            success: true,
            message: 'Registration successful! Welcome to MiniConnect.',
            token,
            user: {
                id: result.insertId,
                name,
                email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during registration. Please try again.'
        });
    }
};

/**
 * LOGIN an existing user
 * POST /api/auth/login
 * 
 * Flow:
 * 1. Get email and password from request body
 * 2. Find user by email in database
 * 3. Compare provided password with hashed password
 * 4. Generate JWT token
 * 5. Send token back to client
 */
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // --- Validation ---
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password.'
            });
        }

        // --- Find user by email ---
        const [users] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        const user = users[0];

        // --- Compare passwords ---
        // bcrypt.compare hashes the provided password and compares with stored hash
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // --- Generate JWT Token ---
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // --- Send success response ---
        res.status(200).json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                bio: user.bio,
                profile_image: user.profile_image
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during login. Please try again.'
        });
    }
};

module.exports = { register, login };

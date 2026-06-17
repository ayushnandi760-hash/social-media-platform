const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');

// Initialize Express app
const app = express();

// =====================
// MIDDLEWARE
// =====================

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Enable CORS (Cross-Origin Resource Sharing)
// This allows the frontend to communicate with the backend
app.use(cors());

// Serve uploaded images as static files
// When someone requests /uploads/image.jpg, Express serves it from the uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// =====================
// API ROUTES
// =====================

// Authentication routes: /api/auth/register, /api/auth/login
app.use('/api/auth', authRoutes);

// Profile routes: /api/profile, /api/profile/upload-image
app.use('/api/profile', profileRoutes);

// Post routes: /api/posts (CRUD operations)
app.use('/api/posts', postRoutes);

// User routes: /api/users (Follow/Unfollow, public profiles)
app.use('/api/users', userRoutes);

// =====================
// SERVE FRONTEND
// =====================

// Serve the main HTML page for any non-API route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// =====================
// ERROR HANDLING
// =====================

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred.'
    });
});

// =====================
// START SERVER
// =====================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════╗
    ║                                           ║
    ║   🚀 MiniConnect Server is Running!       ║
    ║                                           ║
    ║   🌐 URL: http://localhost:${PORT}          ║
    ║   📁 API: http://localhost:${PORT}/api      ║
    ║                                           ║
    ╚═══════════════════════════════════════════╝
    `);
});

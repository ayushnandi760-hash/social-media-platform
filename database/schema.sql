-- MiniConnect Database Schema
-- Phase 1: User Management

CREATE DATABASE IF NOT EXISTS miniconnect;
USE miniconnect;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    bio TEXT DEFAULT NULL,
    profile_image VARCHAR(255) DEFAULT 'default-avatar.png',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index on email for faster login lookups
CREATE INDEX idx_users_email ON users(email);

-- ========================================
-- Phase 2: Posts
-- ========================================

-- Posts Table
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Key: Links each post to a user
    -- ON DELETE CASCADE: If a user is deleted, all their posts are also deleted
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index on user_id for fast lookup of a specific user's posts
CREATE INDEX idx_posts_user_id ON posts(user_id);

-- Index on created_at for efficient feed sorting (newest first)
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);

-- ========================================
-- Phase 3: Likes & Comments
-- ========================================

-- Likes Table
CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,

    -- A user can only like a post once
    UNIQUE KEY unique_like (user_id, post_id)
);

-- Comments Table
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fetching comments for a specific post
CREATE INDEX idx_comments_post_id ON comments(post_id);

-- ========================================
-- Phase 4: Follow System
-- ========================================

-- Followers Table
CREATE TABLE IF NOT EXISTS followers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign Keys
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,

    -- A user can only follow another user once
    UNIQUE KEY unique_follow (follower_id, following_id)
);

-- Indexes for fetching followers and following lists efficiently
CREATE INDEX idx_follower_id ON followers(follower_id);
CREATE INDEX idx_following_id ON followers(following_id);

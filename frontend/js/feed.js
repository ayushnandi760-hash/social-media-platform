/**
 * ============================================
 * MiniConnect - Feed Page JavaScript (Phase 2)
 * ============================================
 * Handles: Creating posts, displaying feed, deleting posts, image upload
 * Used on: feed.html
 * 
 * This file manages the entire Feed experience:
 * 1. Loading the user's profile data (for navbar avatar)
 * 2. Fetching all posts from the API (the "feed")
 * 3. Creating new posts (with optional image upload)
 * 4. Deleting the user's own posts
 * 5. Image preview before posting
 * 6. Image lightbox (click to view full-size)
 */

// =============================================
// Configuration
// =============================================
const API_BASE = 'http://localhost:5000/api';
const UPLOADS_BASE = 'http://localhost:5000/uploads';

// =============================================
// Authentication Helpers
// =============================================

/**
 * Get the JWT token from localStorage
 * If no token exists, redirect to login page
 */
function getToken() {
    const token = localStorage.getItem('miniconnect_token');
    if (!token) {
        window.location.href = 'index.html';
        return null;
    }
    return token;
}

/**
 * Logout: Clear stored data and redirect to login
 */
function logout() {
    localStorage.removeItem('miniconnect_token');
    localStorage.removeItem('miniconnect_user');
    window.location.href = 'index.html';
}

/**
 * Get the current logged-in user's ID from localStorage
 * We need this to check if a post belongs to the current user (for delete button)
 */
function getCurrentUserId() {
    const user = JSON.parse(localStorage.getItem('miniconnect_user'));
    return user ? user.id : null;
}

// =============================================
// UI Helpers
// =============================================

/**
 * Show toast notification
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const icon = type === 'success' ? '✅' : '❌';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Get the proper image URL for any image
 * Handles both profile images and post images
 */
function getImageUrl(imageName) {
    if (!imageName || imageName === 'default-avatar.png') {
        // Generate a default avatar SVG (same as profile.js)
        return `data:image/svg+xml,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
                <defs>
                    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:#6200ee"/>
                        <stop offset="100%" style="stop-color:#00bcd4"/>
                    </linearGradient>
                </defs>
                <rect width="200" height="200" fill="url(#bg)" rx="100"/>
                <text x="100" y="125" font-size="80" text-anchor="middle" fill="white" font-family="Arial">👤</text>
            </svg>
        `)}`;
    }
    return `${UPLOADS_BASE}/${imageName}`;
}

/**
 * Format a date string to a human-readable "time ago" format
 * Examples: "Just now", "5 minutes ago", "2 hours ago", "December 15, 2024"
 */
function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    // For older posts, show the full date
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Format date for full display
 */
function formatFullDate(dateString) {
    const date = new Date(dateString);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleDateString('en-US', options);
}

// =============================================
// Load User Profile Data (for navbar)
// =============================================
async function loadUserData() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/profile`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const user = data.user;
            const imageUrl = getImageUrl(user.profile_image);

            // Update navbar
            document.getElementById('nav-avatar').src = imageUrl;
            document.getElementById('nav-username').textContent = user.name;

            // Update create-post avatar
            document.getElementById('create-post-avatar').src = imageUrl;

            // Save user data to localStorage (keep it fresh)
            localStorage.setItem('miniconnect_user', JSON.stringify(user));
        } else if (response.status === 401) {
            showToast('Session expired. Please login again.', 'error');
            setTimeout(() => logout(), 2000);
        }
    } catch (error) {
        console.error('Load user data error:', error);
    }
}

// =============================================
// Load Feed (All Posts)
// =============================================

/**
 * Fetch all posts from the API and display them
 * 
 * This is the main "feed" function. It:
 * 1. Calls GET /api/posts to get all posts
 * 2. The backend returns posts sorted by newest first
 * 3. Each post includes author_name and author_avatar (from the JOIN)
 * 4. We loop through the posts and create HTML cards for each one
 */
async function loadFeed() {
    const feedLoader = document.getElementById('feed-loader');
    const feedPosts = document.getElementById('feed-posts');
    const emptyFeed = document.getElementById('empty-feed');

    try {
        const token = localStorage.getItem('miniconnect_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        const response = await fetch(`${API_BASE}/posts`, { headers });
        const data = await response.json();

        // Hide loader
        feedLoader.style.display = 'none';

        if (data.success && data.posts.length > 0) {
            // Show posts container
            feedPosts.style.display = 'flex';
            emptyFeed.style.display = 'none';

            // Build HTML for all posts
            feedPosts.innerHTML = data.posts.map((post, index) => createPostCard(post, index)).join('');
        } else {
            // Show empty state
            feedPosts.style.display = 'none';
            emptyFeed.style.display = 'block';
        }

    } catch (error) {
        console.error('Load feed error:', error);
        feedLoader.style.display = 'none';
        showToast('Unable to load feed. Is the server running?', 'error');
    }
}

/**
 * Create HTML for a single post card
 * 
 * This function builds the complete HTML structure for one post.
 * It includes:
 * - Author avatar and name
 * - Post date (formatted as "time ago")
 * - Delete button (only visible if current user is the author)
 * - Post text content
 * - Post image (if any)
 * - Post footer with interaction placeholders
 */
function createPostCard(post, index) {
    const currentUserId = getCurrentUserId();
    const isOwner = currentUserId === post.user_id;
    const authorAvatar = getImageUrl(post.author_avatar);
    const timeAgo = formatTimeAgo(post.created_at);
    const fullDate = formatFullDate(post.created_at);

    // Build image section (only if post has an image)
    const imageSection = post.image_url
        ? `<div class="post-image-container">
               <img 
                   class="post-image" 
                   src="${UPLOADS_BASE}/${post.image_url}" 
                   alt="Post image"
                   onclick="openLightbox('${UPLOADS_BASE}/${post.image_url}')"
                   loading="lazy"
               >
           </div>`
        : '';

    // Build delete button (only for post owner)
    const deleteButton = isOwner
        ? `<div class="post-menu">
               <button class="post-delete-btn" onclick="deletePost(${post.id})" title="Delete this post">
                   🗑️ Delete
               </button>
           </div>`
        : '';

    // Staggered animation delay for each post
    const animDelay = `animation-delay: ${index * 0.1}s`;

    // Build active like state
    const likeActiveClass = post.has_liked ? 'liked' : '';
    const likeHeart = post.has_liked ? '❤️' : '🤍';

    return `
        <article class="post-card" id="post-${post.id}" style="${animDelay}">
            <!-- Post Header -->
            <div class="post-header">
                <div class="post-author" onclick="window.location.href='profile.html?id=${post.user_id}'" style="cursor: pointer;" title="View Profile">
                    <img class="post-author-avatar" src="${authorAvatar}" alt="${post.author_name}'s avatar">
                    <div class="post-author-info">
                        <span class="post-author-name">${escapeHtml(post.author_name)}</span>
                        <span class="post-date" title="${fullDate}">🕐 ${timeAgo}</span>
                    </div>
                </div>
                ${deleteButton}
            </div>

            <!-- Post Content -->
            <div class="post-content">${escapeHtml(post.content)}</div>

            <!-- Post Image (if any) -->
            ${imageSection}

            <!-- Post Footer (Interactions) -->
            <div class="post-footer">
                <div class="post-stats">
                    <button class="post-stat-btn ${likeActiveClass}" id="like-btn-${post.id}" onclick="toggleLike(${post.id}, ${post.has_liked})">
                        <span class="emoji" id="like-icon-${post.id}">${likeHeart}</span> 
                        <span id="like-count-${post.id}">${post.like_count || 0}</span>
                    </button>
                    <button class="post-stat-btn" onclick="toggleComments(${post.id})">
                        <span class="emoji">💬</span> 
                        <span id="comment-count-${post.id}">${post.comment_count || 0}</span>
                    </button>
                </div>
            </div>

            <!-- Comments Section (Hidden by default) -->
            <div class="comments-section" id="comments-section-${post.id}" style="display: none;">
                <div class="comments-list" id="comments-list-${post.id}">
                    <!-- Comments will be loaded here -->
                    <div class="loader-small" style="display: none;"></div>
                </div>
                
                <div class="comment-input-container">
                    <input type="text" class="comment-input" id="comment-input-${post.id}" placeholder="Write a comment..." onkeydown="if(event.key === 'Enter') addComment(${post.id})">
                    <button class="btn btn-sm btn-primary" onclick="addComment(${post.id})">Post</button>
                </div>
            </div>
        </article>
    `;
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * 
 * IMPORTANT SECURITY CONCEPT:
 * If a user types <script>alert('hack')</script> as their post content,
 * we must NOT insert that directly into the page — it would execute!
 * 
 * This function converts special characters to their HTML entity equivalents:
 * < becomes &lt;  (so the browser shows "<" instead of starting an HTML tag)
 * > becomes &gt;
 * & becomes &amp;
 * " becomes &quot;
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================
// Create Post
// =============================================

/**
 * Create a new post
 * 
 * How image upload works with posts:
 * 1. User types text in the textarea
 * 2. User optionally selects an image via the file input
 * 3. When they click "Post", we create a FormData object
 * 4. FormData can hold BOTH text data AND file data
 * 5. We send it to POST /api/posts
 * 6. The backend's multer middleware processes the file
 * 7. The post controller saves everything to the database
 * 
 * NOTE about Content-Type:
 * When sending FormData, we do NOT manually set Content-Type header.
 * The browser automatically sets it to "multipart/form-data" with the 
 * correct boundary string. If we set it manually, it breaks!
 */
async function createPost() {
    const token = getToken();
    if (!token) return;

    const contentInput = document.getElementById('post-content-input');
    const imageInput = document.getElementById('post-image-input');
    const submitBtn = document.getElementById('post-submit-btn');
    const btnText = document.getElementById('post-btn-text');

    const content = contentInput.value.trim();

    // Validate
    if (!content) {
        showToast('Please write something before posting!', 'error');
        contentInput.focus();
        return;
    }

    // Show loading state
    submitBtn.disabled = true;
    btnText.innerHTML = '<span class="spinner"></span> Posting...';

    try {
        // Create FormData to send text + file together
        const formData = new FormData();
        formData.append('content', content);

        // If user selected an image, append it to FormData
        if (imageInput.files[0]) {
            formData.append('post_image', imageInput.files[0]);
        }

        // Send to API
        const response = await fetch(`${API_BASE}/posts`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Do NOT set Content-Type — browser handles it for FormData
            },
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showToast('Post published! 🎉', 'success');

            // Clear the form
            contentInput.value = '';
            imageInput.value = '';
            document.getElementById('image-preview-container').classList.remove('active');
            document.getElementById('char-count').textContent = '0 / 5000';
            document.getElementById('char-count').className = 'char-count';

            // Reload the feed to show the new post
            loadFeed();
        } else {
            showToast(data.message || 'Failed to create post.', 'error');
        }

    } catch (error) {
        console.error('Create post error:', error);
        showToast('Unable to create post. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        btnText.innerHTML = '✨ Post';
    }
}

// =============================================
// Delete Post
// =============================================

/**
 * Delete a post by ID
 * 
 * Flow:
 * 1. Show confirmation dialog (prevent accidental deletes)
 * 2. Send DELETE /api/posts/:id with JWT token
 * 3. Backend checks ownership (only your own posts)
 * 4. If successful, animate the post out and remove from DOM
 */
async function deletePost(postId) {
    // Confirm with user
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) {
        return;
    }

    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch(`${API_BASE}/posts/${postId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Post deleted.', 'success');

            // Animate the post card out
            const postCard = document.getElementById(`post-${postId}`);
            if (postCard) {
                postCard.style.transition = 'all 0.4s ease';
                postCard.style.opacity = '0';
                postCard.style.transform = 'translateX(-30px) scale(0.95)';
                setTimeout(() => {
                    postCard.remove();

                    // Check if feed is now empty
                    const feedPosts = document.getElementById('feed-posts');
                    if (feedPosts.children.length === 0) {
                        feedPosts.style.display = 'none';
                        document.getElementById('empty-feed').style.display = 'block';
                    }
                }, 400);
            }
        } else {
            showToast(data.message || 'Failed to delete post.', 'error');
        }

    } catch (error) {
        console.error('Delete post error:', error);
        showToast('Unable to delete post. Please try again.', 'error');
    }
}

// =============================================
// Image Preview (Before Posting)
// =============================================

/**
 * When user selects an image, show a preview before they post
 * This is purely a frontend feature — the image hasn't been uploaded yet
 * 
 * How it works:
 * 1. User clicks the "Photo" button → file input opens
 * 2. User selects an image → "change" event fires
 * 3. We use FileReader to read the image as a data URL
 * 4. FileReader.readAsDataURL() converts the file to a base64 string
 * 5. We set that base64 string as the <img> src for preview
 * 6. The ACTUAL upload happens when they click "Post" (in createPost())
 */
const postImageInput = document.getElementById('post-image-input');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const imagePreviewRemove = document.getElementById('image-preview-remove');

if (postImageInput) {
    postImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be smaller than 5MB.', 'error');
            postImageInput.value = '';
            return;
        }

        // Read file and show preview
        const reader = new FileReader();
        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreviewContainer.classList.add('active');
        };
        reader.readAsDataURL(file);
    });
}

// Remove image preview
if (imagePreviewRemove) {
    imagePreviewRemove.addEventListener('click', () => {
        postImageInput.value = '';
        imagePreviewContainer.classList.remove('active');
        imagePreview.src = '';
    });
}

// =============================================
// Character Counter
// =============================================
const postContentInput = document.getElementById('post-content-input');

if (postContentInput) {
    postContentInput.addEventListener('input', () => {
        const count = postContentInput.value.length;
        const charCount = document.getElementById('char-count');
        charCount.textContent = `${count} / 5000`;

        // Change color based on character count
        charCount.className = 'char-count';
        if (count > 4500) {
            charCount.classList.add('danger');
        } else if (count > 4000) {
            charCount.classList.add('warning');
        }
    });

    // Allow Ctrl+Enter to submit post
    postContentInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            createPost();
        }
    });
}

// =============================================
// Image Lightbox (Full-size view)
// =============================================

/**
 * Open a full-screen lightbox to view a post image
 * 
 * When user clicks on a post image:
 * 1. We create an overlay div that covers the entire screen
 * 2. We place the full-size image inside it
 * 3. Clicking the overlay or close button closes it
 * 4. ESC key also closes it
 */
function openLightbox(imageUrl) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = `
        <button class="lightbox-close" title="Close">✕</button>
        <img src="${imageUrl}" alt="Full size image">
    `;

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeLightbox(overlay);
        }
    });

    // Close button
    overlay.querySelector('.lightbox-close').addEventListener('click', () => {
        closeLightbox(overlay);
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden'; // Prevent scrolling

    // Close on ESC key
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeLightbox(overlay);
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

function closeLightbox(overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.remove();
        document.body.style.overflow = '';
    }, 300);
}

// =============================================
// Phase 3: Likes & Comments
// =============================================

/**
 * Toggle like status on a post
 */
async function toggleLike(postId, currentHasLiked) {
    const token = getToken();
    if (!token) return;

    // Optimistic UI update
    const btn = document.getElementById(`like-btn-${postId}`);
    const icon = document.getElementById(`like-icon-${postId}`);
    const countSpan = document.getElementById(`like-count-${postId}`);
    
    let currentCount = parseInt(countSpan.textContent);
    const isNowLiking = !currentHasLiked;

    if (isNowLiking) {
        btn.classList.add('liked');
        icon.textContent = '❤️';
        countSpan.textContent = currentCount + 1;
        // Update onclick handler for next click
        btn.setAttribute('onclick', `toggleLike(${postId}, true)`);
    } else {
        btn.classList.remove('liked');
        icon.textContent = '🤍';
        countSpan.textContent = Math.max(0, currentCount - 1);
        btn.setAttribute('onclick', `toggleLike(${postId}, false)`);
    }

    try {
        const method = isNowLiking ? 'POST' : 'DELETE';
        const endpoint = isNowLiking ? 'like' : 'unlike';
        
        const response = await fetch(`${API_BASE}/posts/${postId}/${endpoint}`, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        if (!data.success) {
            // Revert on failure
            showToast(data.message, 'error');
            loadFeed(); // Reload feed to restore correct state
        }
    } catch (error) {
        console.error('Toggle like error:', error);
        showToast('Action failed.', 'error');
        loadFeed(); // Reload feed to restore correct state
    }
}

/**
 * Toggle comments section visibility and load comments if opened
 */
function toggleComments(postId) {
    const section = document.getElementById(`comments-section-${postId}`);
    const isHidden = section.style.display === 'none';
    
    if (isHidden) {
        section.style.display = 'block';
        loadComments(postId);
    } else {
        section.style.display = 'none';
    }
}

/**
 * Fetch and display comments for a post
 */
async function loadComments(postId) {
    const commentsList = document.getElementById(`comments-list-${postId}`);
    commentsList.innerHTML = '<div class="loader-small"></div>';

    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/comments`);
        const data = await response.json();

        if (data.success) {
            if (data.comments.length === 0) {
                commentsList.innerHTML = '<div class="no-comments">No comments yet. Be the first!</div>';
            } else {
                commentsList.innerHTML = data.comments.map(comment => createCommentHTML(comment)).join('');
            }
        } else {
            commentsList.innerHTML = `<div class="error-text">Failed to load comments.</div>`;
        }
    } catch (error) {
        console.error('Load comments error:', error);
        commentsList.innerHTML = `<div class="error-text">Error loading comments.</div>`;
    }
}

/**
 * Build HTML for a single comment
 */
function createCommentHTML(comment) {
    const avatar = getImageUrl(comment.author_avatar);
    const timeAgo = formatTimeAgo(comment.created_at);
    
    return `
        <div class="comment-item">
            <img class="comment-avatar" src="${avatar}" alt="Avatar" onclick="window.location.href='profile.html?id=${comment.user_id}'" style="cursor: pointer;" title="View Profile">
            <div class="comment-body">
                <div class="comment-header">
                    <span class="comment-author" onclick="window.location.href='profile.html?id=${comment.user_id}'" style="cursor: pointer;" title="View Profile">${escapeHtml(comment.author_name)}</span>
                    <span class="comment-time">${timeAgo}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.comment)}</div>
            </div>
        </div>
    `;
}

/**
 * Add a new comment
 */
async function addComment(postId) {
    const token = getToken();
    if (!token) return;

    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();
    
    if (!text) return;

    input.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/posts/${postId}/comment`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ comment: text })
        });

        const data = await response.json();

        if (data.success) {
            input.value = '';
            
            // Increment comment count
            const countSpan = document.getElementById(`comment-count-${postId}`);
            countSpan.textContent = parseInt(countSpan.textContent) + 1;

            // Append new comment to list
            const commentsList = document.getElementById(`comments-list-${postId}`);
            
            // Remove "No comments yet" if it exists
            if (commentsList.querySelector('.no-comments')) {
                commentsList.innerHTML = '';
            }

            commentsList.insertAdjacentHTML('beforeend', createCommentHTML(data.comment));
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Add comment error:', error);
        showToast('Failed to post comment.', 'error');
    } finally {
        input.disabled = false;
        input.focus();
    }
}

// =============================================
// Initialize Feed Page
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    // Load user data (for navbar and create-post avatar)
    loadUserData();

    // Load the feed
    loadFeed();
});

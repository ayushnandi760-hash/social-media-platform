/**
 * ============================================
 * MiniConnect - Profile Page JavaScript
 * ============================================
 * Handles: Displaying profile data, avatar upload
 * Used on: profile.html
 */

// =============================================
// Configuration
// =============================================
const API_BASE = 'http://localhost:5000/api';
const UPLOADS_BASE = 'http://localhost:5000/uploads';

// =============================================
// Authentication Check
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
 * Get the proper image URL for a profile image
 */
function getImageUrl(profileImage) {
    if (!profileImage || profileImage === 'default-avatar.png') {
        // Generate a nice default avatar with SVG
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
    return `${UPLOADS_BASE}/${profileImage}`;
}

/**
 * Format date to a readable string
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// =============================================
// Load Profile Data
// =============================================
async function loadProfile() {
    const token = getToken();
    if (!token) return;

    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id');

    let endpoint = `${API_BASE}/profile`;
    if (targetUserId) {
        endpoint = `${API_BASE}/users/${targetUserId}`;
    }

    try {
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            displayProfile(data.user, !!targetUserId, targetUserId);
        } else {
            // Token might be expired
            if (response.status === 401) {
                showToast('Session expired. Please login again.', 'error');
                setTimeout(() => logout(), 2000);
            } else {
                showToast(data.message || 'Error loading profile', 'error');
            }
        }
    } catch (error) {
        console.error('Load profile error:', error);
        showToast('Unable to load profile. Is the server running?', 'error');
    }
}

/**
 * Display user profile data on the page
 */
function displayProfile(user, isPublicProfile = false, targetUserId = null) {
    const imageUrl = getImageUrl(user.profile_image);

    // Update navbar with logged-in user's info, not the profile we're viewing
    const storedUserStr = localStorage.getItem('miniconnect_user');
    let currentUserId = null;
    if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr);
        currentUserId = storedUser.id;
        document.getElementById('nav-avatar').src = getImageUrl(storedUser.profile_image);
        document.getElementById('nav-username').textContent = storedUser.name;
    }

    // Update profile section
    document.getElementById('profile-avatar').src = imageUrl;
    document.getElementById('profile-name').textContent = user.name;

    // Update email
    const emailEl = document.getElementById('profile-email');
    emailEl.innerHTML = `<span>✉</span><span>${user.email || 'Hidden'}</span>`;

    // Update joined date
    const joinedEl = document.getElementById('profile-joined');
    joinedEl.innerHTML = `<span>📅</span><span>Member since ${formatDate(user.created_at)}</span>`;

    // Update bio
    const bioText = document.getElementById('profile-bio');
    const bioEmpty = document.getElementById('bio-empty');

    if (user.bio && user.bio.trim()) {
        bioText.textContent = user.bio;
        bioText.style.display = 'block';
        bioEmpty.style.display = 'none';
    } else {
        bioText.style.display = 'none';
        bioEmpty.style.display = 'block';
    }

    // Update activity timeline
    document.getElementById('activity-joined').textContent =
        `Joined on ${formatDate(user.created_at)}`;

    // Update Quick Stats
    document.getElementById('stat-posts').textContent = user.posts_count || 0;
    document.getElementById('stat-followers').textContent = user.followers_count || 0;
    document.getElementById('stat-following').textContent = user.following_count || 0;

    // Handle Profile Actions (Edit vs Follow)
    const actionsContainer = document.getElementById('profile-actions');
    const avatarUploadInput = document.getElementById('avatar-upload-input');
    
    // If viewing someone else's profile
    if (isPublicProfile && targetUserId != currentUserId) {
        if (avatarUploadInput) avatarUploadInput.disabled = true;
        
        const isFollowing = user.is_following;
        const btnClass = isFollowing ? 'btn-secondary' : 'btn-primary';
        const btnText = isFollowing ? 'Unfollow' : 'Follow';
        
        actionsContainer.innerHTML = `
            <button class="btn ${btnClass} btn-sm" id="follow-btn" onclick="toggleFollow(${targetUserId}, ${isFollowing})">
                ${btnText}
            </button>
        `;
    } else {
        // Own profile
        if (avatarUploadInput) avatarUploadInput.disabled = false;
        actionsContainer.innerHTML = `
            <a href="edit-profile.html" class="btn btn-secondary btn-sm" id="edit-profile-btn">
                ✏️ Edit Profile
            </a>
        `;
    }

    // Hide loader, show content
    document.getElementById('page-loader').style.display = 'none';
    document.getElementById('profile-content').style.display = 'block';
}

// =============================================
// Phase 4: Follow / Unfollow
// =============================================
async function toggleFollow(targetUserId, currentlyFollowing) {
    const token = getToken();
    if (!token) return;

    const followBtn = document.getElementById('follow-btn');
    followBtn.disabled = true;

    try {
        const endpoint = currentlyFollowing ? 'unfollow' : 'follow';
        const method = currentlyFollowing ? 'DELETE' : 'POST';

        const response = await fetch(`${API_BASE}/users/${targetUserId}/${endpoint}`, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            // Update UI instantly without full reload
            const isNowFollowing = !currentlyFollowing;
            const newBtnClass = isNowFollowing ? 'btn-secondary' : 'btn-primary';
            const newBtnText = isNowFollowing ? 'Unfollow' : 'Follow';
            
            followBtn.className = `btn ${newBtnClass} btn-sm`;
            followBtn.textContent = newBtnText;
            followBtn.setAttribute('onclick', `toggleFollow(${targetUserId}, ${isNowFollowing})`);

            // Update follower count on the screen
            const followersSpan = document.getElementById('stat-followers');
            let currentCount = parseInt(followersSpan.textContent) || 0;
            followersSpan.textContent = isNowFollowing ? currentCount + 1 : Math.max(0, currentCount - 1);
            
            showToast(data.message, 'success');
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Follow toggle error:', error);
        showToast('Action failed. Please try again.', 'error');
    } finally {
        followBtn.disabled = false;
    }
}

// =============================================
// Profile Image Upload (from profile page)
// =============================================
const avatarUploadInput = document.getElementById('avatar-upload-input');

if (avatarUploadInput) {
    avatarUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be smaller than 5MB.', 'error');
            return;
        }

        const token = getToken();
        if (!token) return;

        // Show upload progress
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-bar-fill');
        const statusText = document.getElementById('upload-status');

        progressContainer.classList.add('active');
        progressFill.style.width = '30%';
        statusText.textContent = 'Uploading your new avatar...';

        try {
            // Create FormData (required for file uploads)
            const formData = new FormData();
            formData.append('profile_image', file);

            progressFill.style.width = '60%';

            const response = await fetch(`${API_BASE}/profile/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Note: Do NOT set Content-Type for FormData
                    // The browser automatically sets it with the correct boundary
                },
                body: formData
            });

            const data = await response.json();

            progressFill.style.width = '100%';

            if (data.success) {
                statusText.textContent = 'Upload complete! ✅';
                showToast('Profile picture updated! 📸', 'success');

                // Update the avatar images on the page
                const newImageUrl = `${UPLOADS_BASE}/${data.profile_image}`;
                document.getElementById('profile-avatar').src = newImageUrl;
                document.getElementById('nav-avatar').src = newImageUrl;

                // Update stored user data
                const storedUser = JSON.parse(localStorage.getItem('miniconnect_user'));
                storedUser.profile_image = data.profile_image;
                localStorage.setItem('miniconnect_user', JSON.stringify(storedUser));
            } else {
                statusText.textContent = 'Upload failed ❌';
                showToast(data.message, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            statusText.textContent = 'Upload failed ❌';
            showToast('Failed to upload image. Please try again.', 'error');
        }

        // Hide progress bar after a delay
        setTimeout(() => {
            progressContainer.classList.remove('active');
            progressFill.style.width = '0%';
        }, 2000);
    });
}

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', loadProfile);

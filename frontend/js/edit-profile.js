/**
 * ============================================
 * MiniConnect - Edit Profile JavaScript
 * ============================================
 * Handles: Editing profile info, avatar upload
 * Used on: edit-profile.html
 */

// =============================================
// Configuration
// =============================================
const API_BASE = 'http://localhost:5000/api';
const UPLOADS_BASE = 'http://localhost:5000/uploads';

// =============================================
// Authentication & Utilities
// =============================================

function getToken() {
    const token = localStorage.getItem('miniconnect_token');
    if (!token) {
        window.location.href = 'index.html';
        return null;
    }
    return token;
}

function logout() {
    localStorage.removeItem('miniconnect_token');
    localStorage.removeItem('miniconnect_user');
    window.location.href = 'index.html';
}

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

function showAlert(message, type = 'error') {
    const container = document.getElementById('alert-container');
    const icon = type === 'error' ? '⚠️' : '✅';

    container.innerHTML = `
        <div class="alert alert-${type}">
            <span class="alert-icon">${icon}</span>
            <span>${message}</span>
        </div>
    `;

    setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
            alert.style.opacity = '0';
            setTimeout(() => container.innerHTML = '', 300);
        }
    }, 5000);
}

function getImageUrl(profileImage) {
    if (!profileImage || profileImage === 'default-avatar.png') {
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

// =============================================
// Load Profile Data for Editing
// =============================================
async function loadProfile() {
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
            populateForm(data.user);
        } else {
            if (response.status === 401) {
                showToast('Session expired. Please login again.', 'error');
                setTimeout(() => logout(), 2000);
            }
        }
    } catch (error) {
        console.error('Load profile error:', error);
        showToast('Unable to load profile.', 'error');
    }
}

/**
 * Fill the edit form with current user data
 */
function populateForm(user) {
    const imageUrl = getImageUrl(user.profile_image);

    // Navbar
    document.getElementById('nav-avatar').src = imageUrl;
    document.getElementById('nav-username').textContent = user.name;

    // Edit form
    document.getElementById('edit-avatar').src = imageUrl;
    document.getElementById('edit-name').value = user.name;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-bio').value = user.bio || '';

    // Update character count
    updateCharCount();

    // Hide loader, show form
    document.getElementById('page-loader').style.display = 'none';
    document.getElementById('edit-content').style.display = 'block';
}

// =============================================
// Bio Character Counter
// =============================================
const bioInput = document.getElementById('edit-bio');
const charCount = document.getElementById('bio-char-count');

function updateCharCount() {
    if (bioInput && charCount) {
        charCount.textContent = bioInput.value.length;
    }
}

if (bioInput) {
    bioInput.addEventListener('input', updateCharCount);
}

// =============================================
// Edit Profile Form Submission
// =============================================
const editForm = document.getElementById('edit-profile-form');

if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('edit-name').value.trim();
        const email = document.getElementById('edit-email').value.trim();
        const bio = document.getElementById('edit-bio').value.trim();
        const btn = document.getElementById('save-btn');
        const btnText = document.getElementById('save-btn-text');

        // --- Validation ---
        if (!name || !email) {
            showAlert('Name and email are required.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address.');
            return;
        }

        // --- Loading state ---
        btn.disabled = true;
        btnText.innerHTML = '<span class="spinner"></span> Saving...';

        const token = getToken();
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE}/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, bio })
            });

            const data = await response.json();

            if (data.success) {
                // Update stored user data
                const storedUser = JSON.parse(localStorage.getItem('miniconnect_user'));
                storedUser.name = name;
                storedUser.email = email;
                storedUser.bio = bio;
                localStorage.setItem('miniconnect_user', JSON.stringify(storedUser));

                showToast('Profile updated successfully! 🎉', 'success');

                // Redirect back to profile page
                setTimeout(() => {
                    window.location.href = 'profile.html';
                }, 1500);
            } else {
                showAlert(data.message);
            }
        } catch (error) {
            console.error('Update profile error:', error);
            showAlert('Unable to update profile. Please try again.');
        } finally {
            btn.disabled = false;
            btnText.textContent = '💾 Save Changes';
        }
    });
}

// =============================================
// Avatar Upload from Edit Page
// =============================================
const editAvatarInput = document.getElementById('edit-avatar-input');

if (editAvatarInput) {
    editAvatarInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be smaller than 5MB.', 'error');
            return;
        }

        const token = getToken();
        if (!token) return;

        // Show progress
        const progressContainer = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-bar-fill');
        const statusText = document.getElementById('upload-status');

        progressContainer.classList.add('active');
        progressFill.style.width = '30%';
        statusText.textContent = 'Uploading your new avatar...';

        try {
            const formData = new FormData();
            formData.append('profile_image', file);

            progressFill.style.width = '60%';

            const response = await fetch(`${API_BASE}/profile/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            progressFill.style.width = '100%';

            if (data.success) {
                statusText.textContent = 'Upload complete! ✅';
                showToast('Profile picture updated! 📸', 'success');

                const newImageUrl = `${UPLOADS_BASE}/${data.profile_image}`;
                document.getElementById('edit-avatar').src = newImageUrl;
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
            showToast('Failed to upload image.', 'error');
        }

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

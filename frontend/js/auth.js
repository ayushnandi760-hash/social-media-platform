/**
 * ============================================
 * MiniConnect - Authentication JavaScript
 * ============================================
 * Handles: Login & Register forms
 * Used on: index.html (Login) & register.html (Register)
 */

// =============================================
// Configuration
// =============================================
const API_BASE = 'http://localhost:5000/api';

// =============================================
// Utility Functions
// =============================================

/**
 * Show an alert message inside the form
 * @param {string} message - The message to display
 * @param {string} type - 'error' or 'success'
 */
function showAlert(message, type = 'error') {
    const container = document.getElementById('alert-container');
    const icon = type === 'error' ? '⚠️' : '✅';

    container.innerHTML = `
        <div class="alert alert-${type}">
            <span class="alert-icon">${icon}</span>
            <span>${message}</span>
        </div>
    `;

    // Auto-remove after 5 seconds
    setTimeout(() => {
        const alert = container.querySelector('.alert');
        if (alert) {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => container.innerHTML = '', 300);
        }
    }, 5000);
}

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success' or 'error'
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const icon = type === 'success' ? '✅' : '❌';

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

    container.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Set loading state on a button
 * @param {HTMLElement} button - The button element
 * @param {HTMLElement} textSpan - The text span inside the button
 * @param {boolean} isLoading - Whether to show loading state
 * @param {string} originalText - Original button text
 */
function setButtonLoading(button, textSpan, isLoading, originalText) {
    if (isLoading) {
        button.disabled = true;
        textSpan.innerHTML = '<span class="spinner"></span> Please wait...';
    } else {
        button.disabled = false;
        textSpan.textContent = originalText;
    }
}

/**
 * Save JWT token and user data to localStorage
 * @param {string} token - JWT token
 * @param {object} user - User object
 */
function saveAuthData(token, user) {
    localStorage.setItem('miniconnect_token', token);
    localStorage.setItem('miniconnect_user', JSON.stringify(user));
}

/**
 * Check if user is already logged in and redirect
 */
function checkAuth() {
    const token = localStorage.getItem('miniconnect_token');
    if (token) {
        window.location.href = 'feed.html';
    }
}

// =============================================
// Login Form Handler
// =============================================
const loginForm = document.getElementById('login-form');

if (loginForm) {
    // Check if already logged in
    checkAuth();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent page reload

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');
        const btnText = document.getElementById('login-btn-text');

        // --- Client-side validation ---
        if (!email || !password) {
            showAlert('Please fill in all fields.');
            return;
        }

        // --- Show loading state ---
        setButtonLoading(btn, btnText, true, 'Sign In');

        try {
            // --- Send login request to API ---
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Save token and user data
                saveAuthData(data.token, data.user);

                // Show success message
                showToast('Login successful! Redirecting...', 'success');

                // Redirect to profile page after a short delay
                setTimeout(() => {
                    window.location.href = 'feed.html';
                }, 1000);
            } else {
                showAlert(data.message);
            }
        } catch (error) {
            console.error('Login error:', error);
            showAlert('Unable to connect to server. Please check if the server is running.');
        } finally {
            setButtonLoading(btn, btnText, false, 'Sign In');
        }
    });
}

// =============================================
// Register Form Handler
// =============================================
const registerForm = document.getElementById('register-form');

if (registerForm) {
    // Check if already logged in
    checkAuth();

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const btn = document.getElementById('register-btn');
        const btnText = document.getElementById('register-btn-text');

        // --- Client-side validation ---
        if (!name || !email || !password || !confirmPassword) {
            showAlert('Please fill in all fields.');
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showAlert('Please enter a valid email address.');
            return;
        }

        if (password.length < 6) {
            showAlert('Password must be at least 6 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            showAlert('Passwords do not match.');
            return;
        }

        // --- Show loading state ---
        setButtonLoading(btn, btnText, true, 'Create Account');

        try {
            // --- Send register request to API ---
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (data.success) {
                // Save token and user data
                saveAuthData(data.token, data.user);

                // Show success message
                showToast('Account created successfully! Welcome! 🎉', 'success');

                // Redirect to profile page
                setTimeout(() => {
                    window.location.href = 'feed.html';
                }, 1000);
            } else {
                showAlert(data.message);
            }
        } catch (error) {
            console.error('Registration error:', error);
            showAlert('Unable to connect to server. Please check if the server is running.');
        } finally {
            setButtonLoading(btn, btnText, false, 'Create Account');
        }
    });
}

// =============================================
// Password Visibility Toggle
// =============================================
const toggleBtn = document.getElementById('toggle-password');

if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
        // Find the password input (works for both login and register pages)
        const passwordInput = toggleBtn.closest('.input-wrapper').querySelector('input');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleBtn.textContent = '🔒';
        } else {
            passwordInput.type = 'password';
            toggleBtn.textContent = '👁';
        }
    });
}

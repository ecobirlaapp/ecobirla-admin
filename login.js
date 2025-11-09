// login.js
import { supabase } from './supabase-client.js';

const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const errorMessage = document.getElementById('error-message');
const studentIdInput = document.getElementById('student-id');
const passwordInput = document.getElementById('password');

// --- Check if user is already logged in as admin ---
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        const { data: isAdmin } = await supabase.rpc('is_admin');
        if (isAdmin) {
            window.location.href = 'index.html';
        }
    }
}
checkAuth();

// --- Handle Login Form Submission ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setLoading(true);
    hideError();
    
    const studentId = studentIdInput.value.trim();
    const password = passwordInput.value;

    try {
        // Step 1: Get email from student ID
        const { data: userEmail, error: rpcError } = await supabase
            .rpc('get_email_for_student_id', { p_student_id: studentId });

        if (rpcError || !userEmail) {
            throw new Error("Invalid Student ID.");
        }

        // Step 2: Sign in with email and password
        const { error: loginError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: password,
        });

        if (loginError) {
            throw new Error("Invalid Student ID or Password.");
        }

        // Step 3: CRITICAL - Check if the logged-in user is an admin
        const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
        
        if (adminError || !isAdmin) {
            // If not an admin, log them out immediately and show an error
            await supabase.auth.signOut();
            throw new Error("Access Denied: You are not an admin.");
        }

        // Step 4: Admin confirmed, redirect to dashboard
        window.location.href = 'index.html';

    } catch (error) {
        showError(error.message);
        setLoading(false);
    }
});

function setLoading(isLoading) {
    loginButton.disabled = isLoading;
    loginButton.textContent = isLoading ? 'Logging in...' : 'Login';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
}

// admin/login.js
import { supabase } from './supabase-client.js';

const loginForm = document.getElementById('admin-login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');
const loginButton = document.getElementById('login-button');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.classList.add('hidden');
    loginButton.disabled = true;
    loginButton.textContent = 'Signing In...';

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: emailInput.value,
        password: passwordInput.value,
    });

    if (loginError) {
        showError(loginError.message);
        return;
    }

    if (loginData.user) {
        // Now, check if this user is an admin
        const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');

        if (rpcError) {
            showError(`RPC Error: ${rpcError.message}`);
            await supabase.auth.signOut(); // Log them out
            return;
        }

        if (isAdmin === true) {
            // Success! Redirect to the dashboard
            window.location.href = 'index.html';
        } else {
            // Not an admin
            showError('Access Denied: You are not an administrator.');
            await supabase.auth.signOut();
        }
    }
});

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    loginButton.disabled = false;
    loginButton.textContent = 'Sign In';
}

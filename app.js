// app.js

import { supabase } from './supabase-client.js';

// --- Cloudinary Settings ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dnia8lb2q/image/upload';
const CLOUDINARY_UPLOAD_PRESET = 'EcoBirla_avatars';

// --- Global App State ---
let appState = {
    currentUser: null,
    allStudents: [],
    allHistory: [],
    allLogs: [],
    allStores: [],
    allProducts: [],
    allChallenges: [],
    allEvents: [],
    allLevels: [],
};

// --- DOM Elements ---
const mainContent = document.querySelector('main');
const appLoading = document.getElementById('app-loading');
const pages = document.querySelectorAll('.page');
const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item');
const logoutButton = document.getElementById('logout-button');
const themeToggle = document.getElementById('theme-toggle');

// Page Title
const desktopPageTitle = document.getElementById('desktop-page-title');
const desktopGreeting = document.getElementById('desktop-greeting');

// Sidebar User Info
const userAvatarSidebar = document.getElementById('user-avatar-sidebar');
const userNameSidebar = document.getElementById('user-name-sidebar');

// Dashboard Stats
const statTotalDistributed = document.getElementById('stat-total-distributed');
const statTotalRedeemed = document.getElementById('stat-total-redeemed');
const statTotalBalance = document.getElementById('stat-total-balance');
const liveActivityFeed = document.getElementById('live-activity-feed');

// Table Bodies
const studentsTableBody = document.getElementById('students-table-body');
const storesTableBody = document.getElementById('stores-table-body');
const productsTableBody = document.getElementById('products-table-body');
const challengesTableBody = document.getElementById('challenges-table-body');
const eventsTableBody = document.getElementById('events-table-body');
const levelsTableBody = document.getElementById('levels-table-body');
const activityLogTableBody = document.getElementById('activity-log-table-body');

// Student Detail Page
const studentDetailPage = document.getElementById('student-detail');

// CRUD Modal
const crudModalOverlay = document.getElementById('crud-modal-overlay');
const crudModal = document.getElementById('crud-modal');
const modalTitle = document.getElementById('modal-title');
const crudForm = document.getElementById('crud-form');

// --- Helper Functions ---

const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

/**
 * Activity Logging for Admins
 */
async function logActivity(activity_type, details = {}) {
    try {
        if (!appState.currentUser) return;
        supabase
            .from('activity_log')
            .insert({
                student_id: appState.currentUser.student_id,
                activity_type,
                details
            })
            .then(({ error }) => {
                if (error) console.warn("Error logging admin activity:", error.message);
            });
    } catch (err) {
        console.warn("Failed to log admin activity:", err);
    }
}

/**
 * Cloudinary Image Upload Helper
 */
async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
        });
        const data = await response.json();
        if (data.secure_url) {
            return data.secure_url;
        } else {
            throw new Error('Cloudinary upload failed.');
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        return null;
    }
}

// --- Dark Mode Logic ---
function initializeDarkMode() {
    // const toggle = document.getElementById('theme-toggle'); // Already defined globally
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    themeToggle.addEventListener('click', () => {
        logActivity('admin_toggle_dark_mode');
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    });
}

// --- Data Fetching Functions (Admin) ---

async function fetchAdminProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('auth_id', user.id)
        .single();
    if (error) {
        console.error("Error fetching admin profile:", error.message);
        window.location.href = 'login.html';
    } else {
        appState.currentUser = data;
    }
}

async function fetchDashboardStats() {
    const [distributed, redeemed, balance] = await Promise.all([
        supabase.from('points_history').select('points_change').gt('points_change', 0),
        supabase.from('points_history').select('points_change').eq('type', 'reward-purchase'),
        supabase.from('students').select('current_points')
    ]);

    const totalDistributed = distributed.data?.reduce((sum, item) => sum + item.points_change, 0) || 0;
    const totalRedeemed = redeemed.data?.reduce((sum, item) => sum + item.points_change, 0) || 0;
    const totalBalance = balance.data?.reduce((sum, item) => sum + item.current_points, 0) || 0;

    statTotalDistributed.textContent = totalDistributed;
    statTotalRedeemed.textContent = Math.abs(totalRedeemed);
    statTotalBalance.textContent = totalBalance;
}

async function fetchAllStudents() {
    const { data, error } = await supabase.from('students').select('*').order('name');
    if (error) console.error(error);
    else appState.allStudents = data;
}
async function fetchAllStores() {
    const { data, error } = await supabase.from('stores').select('*').order('name');
    if (error) console.error(error);
    else appState.allStores = data;
}
async function fetchAllProducts() {
    const { data, error } = await supabase.from('products').select('*, stores(name)').order('name');
    if (error) console.error(error);
    else appState.allProducts = data;
}
async function fetchAllChallenges() {
    const { data, error } = await supabase.from('challenges').select('*').order('title');
    if (error) console.error(error);
    else appState.allChallenges = data;
}
async function fetchAllEvents() {
    const { data, error } = await supabase.from('events').select('*').order('event_date', { ascending: false });
    if (error) console.error(error);
    else appState.allEvents = data;
}
async function fetchAllLevels() {
    const { data, error } = await supabase.from('levels').select('*').order('level_number');
    if (error) console.error(error);
    else appState.allLevels = data;
}
async function fetchActivityLog() {
    const { data, error } = await supabase
        .from('activity_log')
        .select('*, students(name, student_id)')
        .order('created_at', { ascending: false })
        .limit(100);
    if (error) console.error("Error fetching activity log:", error.message);
    else appState.allLogs = data;
}

// --- Render Functions ---

function renderHeader() {
    const user = appState.currentUser;
    if (!user) return;
    const avatar = user.avatar_url || 'https://placehold.co/80x80/gray/white?text=Admin';
    userAvatarSidebar.src = avatar;
    userNameSidebar.textContent = user.name;
    
    // Set greeting
    desktopGreeting.textContent = `Hi, ${user.name.split(' ')[0]}! Let's check the stats.`;
}

function renderTopChampions() {
    const container = document.getElementById('top-champions-list');
    if (!container) return; // Only runs on dashboard
    
    container.innerHTML = ''; // Clear list
    
    const sortedStudents = [...appState.allStudents]
        .sort((a, b) => b.current_points - a.current_points)
        .slice(0, 3);
        
    sortedStudents.forEach(student => {
        container.innerHTML += `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <img src="${student.avatar_url || 'https://placehold.co/40x40/gray/white?text=User'}" class="w-10 h-10 rounded-full">
                    <div>
                        <p class="font-semibold text-gray-900 dark:text-white">${student.name}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400">${student.current_points} Pts</p>
                    </div>
                </div>
            </div>
        `;
    });

    if (sortedStudents.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">No student data available.</p>';
    }
    
    lucide.createIcons();
}

function renderDashboard() {
    fetchDashboardStats();
    liveActivityFeed.innerHTML = ''; // Clear feed
    appState.allLogs.slice(0, 10).forEach(log => { // Show 10 most recent
        liveActivityFeed.innerHTML += `
            <div class="border-b dark:border-gray-700 pb-2">
                <p class="text-sm text-gray-900 dark:text-white">
                    <span class="font-semibold">${log.students?.name || 'A user'}</span>
                    ${log.activity_type.replace('_', ' ')}
                    ${log.details?.page ? `(Page: ${log.details.page})` : ''}
                    ${log.details?.action ? `(Action: ${log.details.action})` : ''}
                </p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${new Date(log.created_at).toLocaleString()}</p>
            </div>
        `;
    });
    
    renderTopChampions(); // Render the new champions list
}

function renderStudents() {
    studentsTableBody.innerHTML = '';
    appState.allStudents.forEach(student => {
        studentsTableBody.innerHTML += `
            <tr>
                <td>${student.student_id}</td>
                <td>
                    <div class="flex items-center space-x-3">
                        <img src="${student.avatar_url || 'https://placehold.co/40x40/gray/white?text=User'}" class="w-10 h-10 rounded-full">
                        <span>${student.name}</span>
                    </div>
                </td>
                <td>${student.email}</td>
                <td>${student.current_points}</td>
                <td>${student.is_admin ? '<span class="text-green-500 font-bold">Yes</span>' : 'No'}</td>
                <td class="space-x-2">
                    <button onclick="viewStudentDetails('${student.student_id}')" class="text-green-600 hover:text-green-900">View</button>
                    <button onclick="handleDelete('students', '${student.student_id}')" class="text-red-600 hover:text-red-900">Delete</button>
                </td>
            </tr>
        `;
    });
}

async function viewStudentDetails(studentId) {
    logActivity('admin_view_student', { studentId });
    showPage('student-detail', 'Student Details');
    studentDetailPage.innerHTML = `<p class="text-gray-500 dark:text-gray-400">Loading student data...</p>`;
    
    // Fetch all data for this student in parallel
    const [profile, history, rewards, logs, completions] = await Promise.all([
        supabase.from('students').select('*').eq('student_id', studentId).single(),
        supabase.from('points_history').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
        supabase.from('user_rewards').select('*, products(name)').eq('student_id', studentId).order('purchase_date', { ascending: false }),
        supabase.from('activity_log').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(50),
        supabase.from('challenge_completions').select('*, challenges(title)').eq('student_id', studentId).order('completed_at', { ascending: false })
    ]);

    if (profile.error) {
        studentDetailPage.innerHTML = `<p class="text-red-500">Error loading profile.</p>`;
        return;
    }
    const student = profile.data;

    // Build the page
    studentDetailPage.innerHTML = `
        <button onclick="showPage('students', 'Student Management')" class="flex items-center text-green-600 dark:text-green-400 font-semibold mb-4">
            <i data-lucide="arrow-left" class="w-5 h-5 mr-2"></i> Back to all students
        </button>
        
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1 space-y-6">
                <div class="card p-6 text-center">
                    <img src="${student.avatar_url || 'https://placehold.co/128x128/gray/white?text=User'}" class="w-32 h-32 rounded-full mx-auto mb-4 border-4 border-green-500">
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">${student.name}</h2>
                    <p class="text-gray-500 dark:text-gray-400">${student.email}</p>
                    <p class="text-gray-500 dark:text-gray-400">${student.student_id}</p>
                </div>
                <div class="card p-6">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Details</h3>
                    <div class="space-y-2">
                        <p><strong class="text-gray-500 dark:text-gray-400">Course:</strong> ${student.course || 'N/A'}</p>
                        <p><strong class="text-gray-500 dark:text-gray-400">Mobile:</strong> ${student.mobile || 'N/A'}</p>
                        <p><strong class="text-gray-500 dark:text-gray-400">Joined:</strong> ${new Date(student.joined_at).toLocaleDateString('en-GB')}</p>
                        <p><strong class="text-gray-500 dark:text-gray-400">Admin:</strong> ${student.is_admin ? 'Yes' : 'No'}</p>
                    </div>
                </div>
                <div class="card p-6">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">EcoPoints</h3>
                    <div class="space-y-2">
                        <p class="text-3xl font-bold text-green-600 dark:text-green-400">${student.current_points} <span class="text-lg">Current</span></p>
                        <p class="text-xl font-semibold text-gray-700 dark:text-gray-300">${student.lifetime_points} <span class="text-base">Lifetime</span></p>
                    </div>
                </div>
                <div class="card p-6">
                    <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Update Profile</h3>
                    <form id="update-student-form" class="space-y-4">
                        <input type="hidden" id="student-auth-id" value="${student.auth_id}">
                        <div>
                            <label class="form-label">Name</label>
                            <input id="student-name" class="form-input" value="${student.name}">
                        </div>
                        <div>
                            <label class="form-label">Email</label>
                            <input id="student-email" class="form-input" value="${student.email}">
                        </div>
                        <div>
                            <label class="form-label">Avatar URL (or upload new)</label>
                            <input id="student-avatar-url" class="form-input" value="${student.avatar_url || ''}">
                            <input id="student-avatar-file" type="file" class="mt-2 text-sm text-gray-500">
                        </div>
                        <div>
                            <label class="form-label">Grant Admin Access</label>
                            <input id="student-is-admin" type="checkbox" ${student.is_admin ? 'checked' : ''} class="rounded text-green-500">
                        </div>
                        <button type="submit" class="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg">Update Profile</button>
                    </form>
                </div>
            </div>
            
            <div class="lg:col-span-2 card p-6">
                <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">User Activity</h3>
                <div class="space-y-4 h-[1000px] overflow-y-auto">
                    <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Points History (${history.data?.length || 0})</h4>
                    <div class="space-y-2">${history.data?.map(item => `
                        <div class="flex justify-between p-2 rounded ${item.points_change > 0 ? 'bg-green-50 dark:bg-green-900' : 'bg-red-50 dark:bg-red-900'}">
                            <p>${item.description}</p>
                            <p class="font-bold ${item.points_change > 0 ? 'text-green-600' : 'text-red-600'}">${item.points_change}</p>
                        </div>
                    `).join('')}</div>
                    
                    <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 pt-4">Rewards (${rewards.data?.length || 0})</h4>
                    <div class="space-y-2">${rewards.data?.map(item => `
                        <div class="flex justify-between p-2 rounded bg-gray-50 dark:bg-gray-700">
                            <p>${item.products.name}</p>
                            <p class="font-semibold ${item.status === 'used' ? 'text-gray-500' : 'text-green-600'}">${item.status}</p>
                        </div>
                    `).join('')}</div>

                    <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 pt-4">Challenge Completions (${completions.data?.length || 0})</h4>
                    <div class="space-y-2">${completions.data?.map(item => `
                        <div class="flex justify-between p-2 rounded bg-yellow-50 dark:bg-yellow-900">
                            <p>${item.challenges.title}</p>
                            <p class="text-sm text-gray-500">${new Date(item.completed_at).toLocaleDateString('en-GB')}</p>
                        </div>
                    `).join('')}</div>

                    <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 pt-4">Recent Activity Log (${logs.data?.length || 0})</h4>
                    <div class="space-y-2">${logs.data?.map(item => `
                        <div class="p-2 border-b dark:border-gray-700">
                            <p class="font-semibold">${item.activity_type}</p>
                            <p class="text-xs text-gray-500">${new Date(item.created_at).toLocaleString('en-GB')}</p>
                            <pre class="text-xs text-gray-400">${JSON.stringify(item.details, null, 2)}</pre>
                        </div>
                    `).join('')}</div>
                </div>
            </div>
        </div>
    `;

    // Add event listener for the new form
    document.getElementById('update-student-form').addEventListener('submit', (e) => handleUpdateStudent(e, student.student_id));
    lucide.createIcons();
}

async function handleUpdateStudent(event, studentId) {
    event.preventDefault();
    logActivity('admin_update_student_attempt', { studentId });

    const avatarFile = document.getElementById('student-avatar-file').files[0];
    let avatarUrl = document.getElementById('student-avatar-url').value;

    if (avatarFile) {
        // Upload new avatar if one is selected
        const newUrl = await uploadToCloudinary(avatarFile);
        if (newUrl) {
            avatarUrl = newUrl;
        }
    }

    const updates = {
        name: document.getElementById('student-name').value,
        email: document.getElementById('student-email').value,
        avatar_url: avatarUrl,
        is_admin: document.getElementById('student-is-admin').checked
    };

    // Update the 'students' table
    const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('student_id', studentId);

    if (error) {
        alert("Error updating student: " + error.message);
    } else {
        alert("Student updated successfully!");
        logActivity('admin_update_student_success', { studentId });
        await fetchAllStudents(); // Refresh student list
        renderStudents();
        viewStudentDetails(studentId); // Refresh detail view
    }
}

function renderStores() {
    storesTableBody.innerHTML = '';
    appState.allStores.forEach(item => {
        storesTableBody.innerHTML += `
            <tr>
                <td>${item.id}</td>
                <td>${item.name}</td>
                <td class="space-x-2">
                    <button onclick='openEditModal("stores", ${JSON.stringify(item)})' class="text-blue-600 hover:text-blue-900">Edit</button>
                    <button onclick="handleDelete('stores', '${item.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                </td>
            </tr>
        `;
    });
}

function renderProducts() {
    productsTableBody.innerHTML = '';
    appState.allProducts.forEach(item => {
        productsTableBody.innerHTML += `
            <tr>
                <td>${item.id}</td>
                <td>
                    <div class="flex items-center space-x-3">
                        <img src="${item.images ? item.images[0] : 'https://placehold.co/40x40/gray/white?text=Img'}" class="w-10 h-10 rounded-lg object-cover">
                        <span>${item.name}</span>
                    </div>
                </td>
                <td>${item.stores.name}</td>
                <td>${item.cost_in_points}</td>
                <td class="space-x-2">
                    <button onclick='openEditModal("products", ${JSON.stringify(item)})' class="text-blue-600 hover:text-blue-900">Edit</button>
                    <button onclick="handleDelete('products', '${item.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                </td>
            </tr>
        `;
    });
}

function renderChallenges() {
    challengesTableBody.innerHTML = '';
    appState.allChallenges.forEach(item => {
        challengesTableBody.innerHTML += `
            <tr>
                <td>${item.title}</td>
                <td>${item.points_reward}</td>
                <td><i data-lucide="${item.icon || 'award'}" class="w-5 h-5"></i></td>
                <td class="space-x-2">
                    <button onclick='openEditModal("challenges", ${JSON.stringify(item)})' class="text-blue-600 hover:text-blue-900">Edit</button>
                    <button onclick="handleDelete('challenges', '${item.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                </td>
            </tr>
        `;
    });
    lucide.createIcons();
}

function renderEvents() {
    eventsTableBody.innerHTML = '';
    appState.allEvents.forEach(item => {
        eventsTableBody.innerHTML += `
            <tr>
                <td>${item.title}</td>
                <td>${new Date(item.event_date).toLocaleString('en-GB')}</td>
                <td>${item.points_reward}</td>
                <td class="space-x-2">
                    <button onclick='openEditModal("events", ${JSON.stringify(item)})' class="text-blue-600 hover:text-blue-900">Edit</button>
                    <button onclick="handleDelete('events', '${item.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                </td>
            </tr>
        `;
    });
}

function renderLevels() {
    levelsTableBody.innerHTML = '';
    appState.allLevels.forEach(item => {
        levelsTableBody.innerHTML += `
            <tr>
                <td>${item.level_number}</td>
                <td>${item.title}</td>
                <td>${item.min_points}</td>
                <td class="space-x-2">
                    <button onclick='openEditModal("levels", ${JSON.stringify(item)})' class="text-blue-600 hover:text-blue-900">Edit</button>
                    <button onclick="handleDelete('levels', '${item.level_number}')" class="text-red-600 hover:text-red-900">Delete</button>
                </td>
            </tr>
        `;
    });
}

function renderActivityLog() {
    activityLogTableBody.innerHTML = '';
    appState.allLogs.forEach(log => {
        activityLogTableBody.innerHTML += `
            <tr>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>${log.students?.name || log.student_id}</td>
                <td><span class="px-2 py-1 text-xs font-semibold bg-gray-200 dark:bg-gray-700 rounded-full">${log.activity_type}</span></td>
                <td><pre class="text-xs">${JSON.stringify(log.details)}</pre></td>
            </tr>
        `;
    });
}

// --- CRUD Modal Logic ---

function populateModalForm(type, item = null) {
    crudForm.innerHTML = ''; // Clear form
    crudForm.dataset.type = type; // Set type for submit handler
    crudForm.dataset.id = item ? (item.id || item.level_number) : ''; // Set id for submit handler

    let fields = '';
    
    switch (type) {
        case 'stores':
            fields = `
                <div>
                    <label class="form-label">Store ID (e.g., 's1', 'canteen')</label>
                    <input name="id" class="form-input" value="${item?.id || ''}" ${item ? 'readonly' : ''} required>
                </div>
                <div>
                    <label class="form-label">Store Name</label>
                    <input name="name" class="form-input" value="${item?.name || ''}" required>
                </div>
                <div>
                    <label class="form-label">Logo URL</label>
                    <input name="logo_url" class="form-input" value="${item?.logo_url || ''}">
                </div>
            `;
            break;
        case 'products':
            fields = `
                <div>
                    <label class="form-label">Product ID (e.g., 'p1', 'veg-thali')</label>
                    <input name="id" class="form-input" value="${item?.id || ''}" ${item ? 'readonly' : ''} required>
                </div>
                <div>
                    <label class="form-label">Store</label>
                    <select name="store_id" class="form-input" required>
                        ${appState.allStores.map(store => `<option value="${store.id}" ${item?.store_id === store.id ? 'selected' : ''}>${store.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="form-label">Product Name</label>
                    <input name="name" class="form-input" value="${item?.name || ''}" required>
                </div>
                <div>
                    <label class="form-label">Description</label>
                    <textarea name="description" class="form-input">${item?.description || ''}</textarea>
                </div>
                <div>
                    <label class="form-label">Image URLs (comma-separated)</label>
                    <input name="images" class="form-input" value="${item?.images?.join(',') || ''}">
                    <label class="form-label mt-2">...or upload new (replaces all)</label>
                    <input name="image_upload" type="file" class="text-sm text-gray-500 dark:text-gray-400">
                </div>
                <div>
                    <label class="form-label">Original Price (INR)</label>
                    <input name="original_price_inr" type="number" class="form-input" value="${item?.original_price_inr || 0}">
                </div>
                <div>
                    <label class="form-label">Discounted Price (INR)</label>
                    <input name="discounted_price_inr" type="number" class="form-input" value="${item?.discounted_price_inr || 0}">
                </div>
                <div>
                    <label class="form-label">Cost (in EcoPoints)</label>
                    <input name="cost_in_points" type="number" class="form-input" value="${item?.cost_in_points || 0}" required>
                </div>
                <div>
                    <label class="form-label">Instructions</label>
                    <input name="instructions" class="form-input" value="${item?.instructions || ''}">
                </div>
            `;
            break;
        case 'challenges':
            fields = `
                <div>
                    <label class="form-label">Title</label>
                    <input name="title" class="form-input" value="${item?.title || ''}" required>
                </div>
                <div>
                    <label class="form-label">Description</label>
                    <input name="description" class="form-input" value="${item?.description || ''}">
                </div>
                <div>
                    <label class="form-label">Points Reward</label>
                    <input name="points_reward" type="number" class="form-input" value="${item?.points_reward || 0}" required>
                </div>
                <div>
                    <label class="form-label">Lucide Icon Name (e.g., 'walk')</label>
                    <input name="icon" class="form-input" value="${item?.icon || ''}">
                </div>
            `;
            break;
        case 'events':
            fields = `
                <div>
                    <label class="form-label">Title</label>
                    <input name="title" class="form-input" value="${item?.title || ''}" required>
                </div>
                <div>
                    <label class="form-label">Description</label>
                    <input name="description" class="form-input" value="${item?.description || ''}">
                </div>
                <div>
                    <label class="form-label">Event Date & Time</label>
                    <input name="event_date" type="datetime-local" class="form-input" value="${item ? new Date(item.event_date).toISOString().slice(0, 16) : ''}" required>
                </div>
                <div>
                    <label class="form-label">Points Reward</label>
                    <input name="points_reward" type="number" class="form-input" value="${item?.points_reward || 0}" required>
                </div>
            `;
            break;
        case 'levels':
            fields = `
                <div>
                    <label class="form-label">Level Number</label>
                    <input name="level_number" type="number" class="form-input" value="${item?.level_number || ''}" ${item ? 'readonly' : ''} required>
                </div>
                <div>
                    <label class="form-label">Title</label>
                    <input name="title" class="form-input" value="${item?.title || ''}" required>
                </div>
                <div>
                    <label class="form-label">Minimum Points Required</label>
                    <input name="min_points" type="number" class="form-input" value="${item?.min_points || 0}" required>
                </div>
            `;
            break;
    }
    
    fields += `
        <button type="submit" id="modal-submit-button" class="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-lg">
            ${item ? 'Update' : 'Create'}
        </button>
    `;
    
    crudForm.innerHTML = fields;
}

window.openCreateModal = (type) => {
    logActivity('admin_modal_open', { action: 'create', type });
    modalTitle.textContent = `Add New ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    populateModalForm(type);
    crudModalOverlay.classList.remove('hidden');
    crudModal.classList.remove('hidden');
    lucide.createIcons();
}

window.openEditModal = (type, item) => {
    logActivity('admin_modal_open', { action: 'edit', type, id: item.id || item.level_number });
    modalTitle.textContent = `Edit ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    populateModalForm(type, item);
    crudModalOverlay.classList.remove('hidden');
    crudModal.classList.remove('hidden');
    lucide.createIcons();
}

window.closeCrudModal = () => {
    crudModalOverlay.classList.add('hidden');
    crudModal.classList.add('hidden');
    crudForm.innerHTML = '';
}

async function handleCrudFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const type = form.dataset.type;
    const id = form.dataset.id;
    const isEdit = !!id;
    
    logActivity('admin_crud_submit', { action: isEdit ? 'update' : 'create', type, id });

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Handle file upload for products
    if (type === 'products' && formData.get('image_upload')?.size > 0) {
        const file = formData.get('image_upload');
        const imageUrl = await uploadToCloudinary(file);
        if (imageUrl) {
            data.images = [imageUrl]; // Set images to the new URL
        }
    } else if (type === 'products') {
        data.images = data.images.split(',').filter(url => url.trim() !== '');
    }
    delete data.image_upload;
    
    let query;
    if (isEdit) {
        const primaryKey = type === 'levels' ? 'level_number' : 'id';
        query = supabase.from(type).update(data).eq(primaryKey, id);
    } else {
        query = supabase.from(type).insert(data);
    }
    
    const { error } = await query;
    
    if (error) {
        alert(`Error: ${error.message}`);
        logActivity('admin_crud_failed', { type, id, error: error.message });
    } else {
        alert(`${type.slice(0, -1)} ${isEdit ? 'updated' : 'created'} successfully!`);
        logActivity('admin_crud_success', { type, id });
        closeCrudModal();
        await loadDataForPage(type); 
        refreshCurrentPage();
    }
}

window.handleDelete = async (type, id) => {
    if (!confirm(`Are you sure you want to delete this ${type.slice(0, -1)}? This cannot be undone.`)) {
        return;
    }
    
    logActivity('admin_delete_attempt', { type, id });
    const primaryKey = type === 'levels' ? 'level_number' : 'id';

    const { error } = await supabase.from(type).delete().eq(primaryKey, id);

    if (error) {
        alert(`Error: ${error.message}`);
        logActivity('admin_delete_failed', { type, id, error: error.message });
    } else {
        alert(`${type.slice(0, -1)} deleted successfully!`);
        logActivity('admin_delete_success', { type, id });
        await loadDataForPage(type);
        refreshCurrentPage();
    }
}

// --- Page Navigation & Initialization ---

async function loadDataForPage(pageId) {
    switch (pageId) {
        case 'dashboard':
            await Promise.all([fetchDashboardStats(), fetchActivityLog()]);
            break;
        case 'students':
        case 'student-detail':
            await fetchAllStudents();
            break;
        case 'stores':
            await fetchAllStores();
            break;
        case 'products':
            await Promise.all([fetchAllProducts(), fetchAllStores()]);
            break;
        case 'challenges':
            await fetchAllChallenges();
            break;
        case 'events':
            await fetchAllEvents();
            break;
        case 'levels':
            await fetchAllLevels();
            break;
        case 'activity-log':
            await fetchActivityLog();
            break;
    }
}

function refreshCurrentPage() {
    const activePage = document.querySelector('.page.active');
    if (activePage) {
        renderPage(activePage.id);
    }
}

function renderPage(pageId) {
    // const navButton = Array.from(sidebarNavItems).find(btn => btn.getAttribute('onclick').includes(`'${pageId}'`));
    // desktopPageTitle.textContent = navButton ? navButton.textContent : 'Dashboard';

    switch (pageId) {
        case 'dashboard':
            renderDashboard();
            break;
        case 'students':
            renderStudents();
            break;
        case 'stores':
            renderStores();
            break;
        case 'products':
            renderProducts();
            break;
        case 'challenges':
            renderChallenges();
            break;
        case 'events':
            renderEvents();
            break;
        case 'levels':
            renderLevels();
            break;
        case 'activity-log':
            renderActivityLog();
            break;
    }
}

window.showPage = (pageId, pageTitle) => {
    pages.forEach(p => p.classList.remove('active'));
    
    const newPage = document.getElementById(pageId);
    if (newPage) {
        newPage.classList.add('active');
    }
    
    sidebarNavItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('onclick').includes(`'${pageId}'`));
    });
    
    mainContent.scrollTop = 0;
    
    logActivity('admin_page_view', { page: pageId });
    
    // Set the main header title
    desktopPageTitle.textContent = pageTitle || pageId.charAt(0).toUpperCase() + pageId.slice(1);
    
    // Hide/show greeting based on page
    desktopGreeting.classList.toggle('hidden', pageId !== 'dashboard');
    
    loadDataForPage(pageId).then(() => {
        renderPage(pageId);
    });
}

// --- App Initialization ---

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return false;
    }
    
    const { data: isAdmin, error } = await supabase.rpc('is_admin');
    if (error || !isAdmin) {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
        return false;
    }
    
    return true; // User is logged in AND is an admin
}

async function loadInitialData() {
    appLoading.style.display = 'flex';

    await fetchAdminProfile();
    
    if (!appState.currentUser) {
        console.error("Could not load admin profile. Logging out.");
        await supabase.auth.signOut();
        window.location.href = 'login.html';
        return;
    }

    logActivity('admin_login_success');

    // Fetch all data in parallel
    await Promise.all([
        fetchDashboardStats(),
        fetchAllStudents(),
        fetchAllStores(),
        fetchAllProducts(),
        fetchAllChallenges(),
        fetchAllEvents(),
        fetchAllLevels(),
        fetchActivityLog()
    ]);
    
    appLoading.style.display = 'none';
}

// Make functions globally accessible for inline onclick=""
Object.assign(window, {
    showPage,
    openCreateModal,
    openEditModal,
    closeCrudModal,
    handleDelete,
    viewStudentDetails
});

document.addEventListener('DOMContentLoaded', async () => {
    initializeDarkMode();
    
    logoutButton.addEventListener('click', async () => {
        logActivity('admin_logout');
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });
    
    crudForm.addEventListener('submit', handleCrudFormSubmit);

    const isLoggedIn = await checkAuth();
    if (!isLoggedIn) {
        return;
    }
    
    await loadInitialData();

    renderHeader();
    // renderDashboard() is called by showPage
    
    showPage('dashboard', 'Dashboard');
    lucide.createIcons(); 
});

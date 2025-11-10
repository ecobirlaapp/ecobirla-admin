// admin/admin.js
import { supabase } from './supabase-client.js';

// --- CONSTANTS ---
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dnia8lb2q/image/upload';
const CLOUDINARY_PRESET = 'EcoBirla_avatars';

// --- GLOBAL STATE ---
const state = {
    adminUser: null,
    allStudents: [],
    allHistory: [],
    allActivity: [],
    allEvents: [],
    allStores: [],
    allProducts: [],
    allChallenges: [],
    allLevels: [],
    currentEventRSVPs: [],
    viewsOverTimeChart: null,
    pageViewChart: null,
    editingItem: null, // Stores item being edited
    currentAnalyticsRange: 'week', // Default analytics range
};

// --- DOM ELEMENTS ---
const loader = document.getElementById('app-loader');
const allPages = document.querySelectorAll('.page');
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebar-backdrop');
const menuToggleBtn = document.getElementById('menu-toggle-btn');
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const logoutButton = document.getElementById('logout-button');
const adminAvatar = document.getElementById('admin-avatar');
const adminName = document.getElementById('admin-name');
const themeToggle = document.getElementById('theme-toggle');
const themeIconLight = document.getElementById('theme-icon-light');
const themeIconDark = document.getElementById('theme-icon-dark');

// Dashboard Stats
const statTotalDistributed = document.getElementById('stat-total-distributed');
const statTotalRedeemed = document.getElementById('stat-total-redeemed');
const statCurrentBalance = document.getElementById('stat-current-balance');
const statCo2Saved = document.getElementById('stat-co2-saved');
const statItemsRecycled = document.getElementById('stat-items-recycled');
const statEventsAttended = document.getElementById('stat-events-attended');
const activityLogFeed = document.getElementById('activity-log-feed');
const viewsOverTimeCtx = document.getElementById('views-over-time-chart');
const pageViewCtx = document.getElementById('page-view-chart');

// Students Page
const topChampionsList = document.getElementById('top-champions-list');
const allStudentsTableBody = document.getElementById('all-students-table-body');
const studentSearch = document.getElementById('student-search');

// Student Detail Page
const studentDetailName = document.getElementById('student-detail-name');
const studentDetailAvatar = document.getElementById('student-detail-avatar');
const studentDetailNameCard = document.getElementById('student-detail-name-card');
const studentDetailEmail = document.getElementById('student-detail-email');
const studentDetailId = document.getElementById('student-detail-id');
const studentDetailCourse = document.getElementById('student-detail-course');
const studentDetailMobile = document.getElementById('student-detail-mobile');
const studentDetailCurrentPts = document.getElementById('student-detail-current-pts');
const studentDetailLifetimePts = document.getElementById('student-detail-lifetime-pts');
const studentDetailIsAdmin = document.getElementById('student-detail-is-admin');
const studentDetailJoined = document.getElementById('student-detail-joined');
const studentDetailHistoryTable = document.getElementById('student-detail-history-table');
const studentDetailRewardsTable = document.getElementById('student-detail-rewards-table');
const studentDetailLogsTable = document.getElementById('student-detail-logs-table');
const studentTabs = document.querySelectorAll('.student-tab');
const studentTabContents = document.querySelectorAll('.student-tab-content');
const editStudentBtn = document.getElementById('edit-student-btn');

// Events Page
const eventsTableBody = document.getElementById('events-table-body');

// Event Detail Page
const eventDetailTitle = document.getElementById('event-detail-title');
const rsvpTableBody = document.getElementById('rsvp-table-body');
const selectAllAttended = document.getElementById('select-all-attended');
const awardPointsBtn = document.getElementById('award-points-btn');
const exportRsvpPdfBtn = document.getElementById('export-rsvp-pdf');
const exportAttendancePdfBtn = document.getElementById('export-attendance-pdf');

// Store Page
const storesTableBody = document.getElementById('stores-table-body');
const productsTableBody = document.getElementById('products-table-body');

// Content Page
const challengesTableBody = document.getElementById('challenges-table-body');
const levelsTableBody = document.getElementById('levels-table-body');

// Modal
const modalBackdrop = document.getElementById('modal-backdrop');
const modalContainer = document.getElementById('modal-container');
const modalForm = document.getElementById('modal-form');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalError = document.getElementById('modal-error');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalCancelBtn = document.getElementById('modal-cancel-btn');
const modalSaveBtn = document.getElementById('modal-save-btn');

// Toast
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    checkAuthAndAdmin();
    setupEventListeners();
});

async function checkAuthAndAdmin() {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        window.location.href = 'login.html';
        return;
    }
    
    // Check if user is an admin
    const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin');
    
    if (rpcError || !isAdmin) {
        alert('Access Denied: You are not an administrator.');
        await supabase.auth.signOut();
        window.location.href = 'login.html';
        return;
    }

    // Admin is verified, load the app
    const { data: studentData } = await supabase
        .from('students')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
    
    state.adminUser = studentData;
    adminName.textContent = state.adminUser.name;
    adminAvatar.src = state.adminUser.avatar_url || 'https://placehold.co/80x80/gray/white?text=A';

    await loadInitialData();
}

async function loadInitialData() {
    loader.classList.remove('hidden');
    
    try {
        const [
            students,
            history,
            activity,
            events,
            stores,
            products,
            challenges,
            levels
        ] = await Promise.all([
            supabase.from('students').select('*').order('lifetime_points', { ascending: false }),
            supabase.from('points_history').select('*'),
            supabase.from('activity_log').select('*').order('created_at', { ascending: false }),
            supabase.from('events').select('*, event_rsvps(count)').order('event_date', { ascending: false }),
            supabase.from('stores').select('*').order('name'),
            supabase.from('products').select('*, stores(name)').order('name'),
            supabase.from('challenges').select('*').order('title'),
            supabase.from('levels').select('*').order('level_number')
        ]);

        state.allStudents = students.data || [];
        state.allHistory = history.data || [];
        state.allActivity = activity.data || [];
        state.allEvents = events.data || [];
        state.allStores = stores.data || [];
        state.allProducts = products.data || [];
        state.allChallenges = challenges.data || [];
        state.allLevels = levels.data || [];

        // Render default page
        renderDashboard();
        renderStudents();
        renderEvents();
        renderStore();
        renderContent();
        
        navigateTo(window.location.hash || '#dashboard');

    } catch (err) {
        console.error("Error loading initial data:", err);
        alert(`Error loading data: ${err.message}`);
    } finally {
        loader.classList.add('hidden');
    }
}

// --- NAVIGATION ---
function setupEventListeners() {
    // Logout
    logoutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = 'login.html';
    });

    // ===== Mobile Sidebar Toggle =====
    menuToggleBtn.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        sidebarBackdrop.classList.remove('hidden');
    });

    sidebarBackdrop.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        sidebarBackdrop.classList.add('hidden');
    });

    // Theme Toggle
    const updateThemeIcon = () => {
        if (document.documentElement.classList.contains('dark')) {
            themeIconLight.classList.add('hidden');
            themeIconDark.classList.remove('hidden');
        } else {
            themeIconLight.classList.remove('hidden');
            themeIconDark.classList.add('hidden');
        }
    };

    themeToggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        
        if (document.documentElement.classList.contains('dark')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
        updateThemeIcon();
        renderAnalyticsCharts(state.currentAnalyticsRange); // Re-render charts for new theme
    });
    updateThemeIcon(); // Set initial icon

    // Sidebar Navigation
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const hash = link.hash;
            navigateTo(hash);
            
            // Close sidebar on mobile after navigation
            if (window.innerWidth < 768) {
                sidebar.classList.add('-translate-x-full');
                sidebarBackdrop.classList.add('hidden');
            }
        });
    });
    
    // Back Buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            navigateTo(`#${e.currentTarget.dataset.target}`);
        });
    });

    // Analytics Range Buttons
    document.querySelectorAll('.analytics-range-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.analytics-range-btn').forEach(b => b.classList.remove('analytics-active'));
            e.currentTarget.classList.add('analytics-active');
            renderAnalyticsCharts(e.currentTarget.dataset.range);
        });
    });

    // Student Detail Tabs
    studentTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.dataset.tab;
            studentTabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');

            studentTabContents.forEach(c => c.classList.add('hidden'));
            // FIX: Add null check for tab content
            const content = document.getElementById(`tab-${targetTab}`);
            if (content) content.classList.remove('hidden');
        });
    });
    
    // Student Search
    studentSearch.addEventListener('input', (e) => {
        renderStudents(e.target.value.toLowerCase());
    });
    
    // Event Detail Listeners
    selectAllAttended.addEventListener('change', (e) => {
        document.querySelectorAll('.attended-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
    });
    awardPointsBtn.addEventListener('click', handleAwardEventPoints);
    exportRsvpPdfBtn.addEventListener('click', () => exportEventData('rsvp'));
    exportAttendancePdfBtn.addEventListener('click', () => exportEventData('attendance'));
    editStudentBtn.addEventListener('click', () => {
        const studentId = editStudentBtn.dataset.studentId;
        const student = state.allStudents.find(s => s.student_id === studentId);
        openModal('student', student);
    });

    // Modal Listeners
    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    modalForm.addEventListener('submit', handleFormSubmit);

    // Add New Buttons
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // FIX: Add guard clause to prevent error if data-modal is missing
            const modalType = e.currentTarget.dataset.modal?.replace('modal-', '');
            if (!modalType) return;
            openModal(modalType);
        });
    });
}

function navigateTo(hash) {
    if (!hash) hash = '#dashboard';
    
    // Hide all pages
    allPages.forEach(page => page.classList.add('hidden'));
    
    // Show target page
    const targetPageId = `page-${hash.substring(1)}`;
    const targetPage = document.getElementById(targetPageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    } else {
        document.getElementById('page-dashboard').classList.remove('hidden'); // Fallback
    }

    // Update sidebar
    sidebarLinks.forEach(link => {
        if (link.hash === hash) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Update URL hash
    window.location.hash = hash;
}

// --- RENDER: DASHBOARD ---
function renderDashboard() {
    // 1. EcoPoints Stats
    const totalDistributed = state.allHistory
        .filter(h => h.points_change > 0)
        .reduce((sum, h) => sum + h.points_change, 0);
    const totalRedeemed = state.allHistory
        .filter(h => h.points_change < 0)
        .reduce((sum, h) => sum + h.points_change, 0);
    
    statTotalDistributed.textContent = totalDistributed.toLocaleString();
    statTotalRedeemed.textContent = Math.abs(totalRedeemed).toLocaleString();
    statCurrentBalance.textContent = (totalDistributed + totalRedeemed).toLocaleString();

    // 2. Impact Stats
    statCo2Saved.textContent = `${Math.floor(totalDistributed * 0.8)} kg`;
    statItemsRecycled.textContent = state.allHistory.filter(h => h.description.toLowerCase().includes('submitted')).length;
    statEventsAttended.textContent = state.allHistory.filter(h => h.description.toLowerCase().includes('attended')).length;

    // 3. Analytics Charts
    renderAnalyticsCharts(state.currentAnalyticsRange);
    
    // 4. Activity Feed
    const studentMap = new Map(state.allStudents.map(s => [s.student_id, s.name]));
    activityLogFeed.innerHTML = '';
    const feed = state.allActivity.slice(0, 50).map(log => {
        let details = '';
        if (log.details && log.details.page) details = `(Page: ${log.details.page})`;
        if (log.details && log.details.action) details = `(Action: ${log.details.action})`;

        const studentName = studentMap.get(log.student_id) || log.student_id;

        return `
            <div class="py-2 px-3 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <p class="text-sm text-gray-800 dark:text-gray-200">
                    <span class="font-semibold text-green-600 dark:text-green-400">${studentName}</span>
                    ${log.activity_type.replace(/_/g, ' ')} ${details}
                </p>
                <p class="text-xs text-gray-500">${new Date(log.created_at).toLocaleString()}</p>
            </div>
        `;
    }).join('');
    activityLogFeed.innerHTML = feed || '<p class="text-gray-500 dark:text-gray-400 text-center p-4">No activity found.</p>';
}

function renderAnalyticsCharts(range = 'week') {
    state.currentAnalyticsRange = range;
    const isDarkMode = document.documentElement.classList.contains('dark');
    const textColor = isDarkMode ? '#9ca3af' : '#4b5563';
    const gridColor = isDarkMode ? '#374151' : '#e5e7eb';

    // --- NEW: Filter activity log based on selected range ---
    let filteredActivity = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of today

    switch(range) {
        case 'day':
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            filteredActivity = state.allActivity.filter(log => {
                const logDate = new Date(log.created_at);
                return logDate >= startOfDay && logDate <= today;
            });
            break;
        case 'month':
             const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            filteredActivity = state.allActivity.filter(log => {
                const logDate = new Date(log.created_at);
                return logDate >= startOfMonth && logDate <= today;
            });
            break;
        case 'year':
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            filteredActivity = state.allActivity.filter(log => {
                const logDate = new Date(log.created_at);
                return logDate >= startOfYear && logDate <= today;
            });
            break;
        case 'week':
        default:
            const startOfWeek = new Date();
            startOfWeek.setDate(today.getDate() - 6);
            startOfWeek.setHours(0, 0, 0, 0);
            filteredActivity = state.allActivity.filter(log => {
                const logDate = new Date(log.created_at);
                return logDate >= startOfWeek && logDate <= today;
            });
            break;
    }

    // --- Page View Distribution (Doughnut Chart) ---
    // UPDATED: Use filteredActivity
    const pageViews = filteredActivity
        .filter(log => log.activity_type === 'page_view')
        .reduce((acc, log) => {
            const page = log.details.page || 'unknown';
            acc[page] = (acc[page] || 0) + 1;
            return acc;
        }, {});
    
    if (state.pageViewChart) state.pageViewChart.destroy();
    state.pageViewChart = new Chart(pageViewCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(pageViews),
            datasets: [{
                label: 'Page Views',
                data: Object.values(pageViews),
                backgroundColor: ['#34D399', '#60A5FA', '#F87171', '#FBBF24', '#A78BFA', '#EC4899'],
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: textColor } } }
        }
    });

    // --- Views Over Time (Line Chart) ---
    // UPDATED: Use filteredActivity
    let labels, data;
    const getISODate = (d) => d.toISOString().split('T')[0];
    
    switch(range) {
        case 'day':
            labels = [...Array(24).keys()].map(h => `${h}:00`);
            const viewsByHour = filteredActivity
                .filter(log => log.activity_type === 'page_view')
                .reduce((acc, log) => {
                    const hour = new Date(log.created_at).getHours();
                    acc[hour] = (acc[hour] || 0) + 1;
                    return acc;
                }, {});
            data = labels.map((_, i) => viewsByHour[i] || 0);
            break;
        
        case 'month':
            const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            labels = [...Array(daysInMonth).keys()].map(i => {
                const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
                return getISODate(d);
            });
            const viewsByDayOfMonth = filteredActivity
                .filter(log => log.activity_type === 'page_view')
                .reduce((acc, log) => {
                    const day = new Date(log.created_at).toISOString().split('T')[0];
                    acc[day] = (acc[day] || 0) + 1;
                    return acc;
                }, {});
            data = labels.map(day => viewsByDayOfMonth[day] || 0);
            break;
            
        case 'year':
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const viewsByMonth = filteredActivity
                .filter(log => log.activity_type === 'page_view')
                .reduce((acc, log) => {
                    const month = new Date(log.created_at).getMonth(); // 0-11
                    acc[month] = (acc[month] || 0) + 1;
                    return acc;
                }, {});
            data = labels.map((_, i) => viewsByMonth[i] || 0);
            break;
            
        case 'week': // Default
        default:
            labels = [...Array(7).keys()].map(i => {
                const d = new Date();
                d.setDate(d.getDate() - i);
                return getISODate(d);
            }).reverse();
            const viewsByDayOfWeek = filteredActivity
                .filter(log => log.activity_type === 'page_view')
                .reduce((acc, log) => {
                    const day = new Date(log.created_at).toISOString().split('T')[0];
                    acc[day] = (acc[day] || 0) + 1;
                    return acc;
                }, {});
            data = labels.map(day => viewsByDayOfWeek[day] || 0);
            break;
    }

    if (state.viewsOverTimeChart) state.viewsOverTimeChart.destroy();
    state.viewsOverTimeChart = new Chart(viewsOverTimeCtx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Page Views',
                data: data,
                backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.2)' : 'rgba(5, 150, 105, 0.1)',
                borderColor: '#059669',
                borderWidth: 2,
                tension: 0.3, // <-- IMPROVED
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
                x: { ticks: { color: textColor }, grid: { color: gridColor } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// --- RENDER: STUDENTS ---
function renderStudents(searchTerm = '') {
    // 1. Top Champions
    topChampionsList.innerHTML = '';
    const champions = state.allStudents.slice(0, 5).map((student, index) => `
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
            <span class="text-2xl font-bold ${index === 0 ? 'text-yellow-400' : (index === 1 ? 'text-gray-400 dark:text-gray-300' : (index === 2 ? 'text-yellow-600' : 'text-gray-500 dark:text-gray-400'))}">
                #${index + 1}
            </span>
            <img src="${student.avatar_url || 'https://placehold.co/80x80/gray/white?text=S'}" class="w-16 h-16 rounded-full mx-auto my-2 border-2 ${index === 0 ? 'border-yellow-400' : 'border-gray-300 dark:border-gray-600'}">
            <p class="font-semibold text-gray-900 dark:text-white truncate">${student.name}</p>
            <p class="text-sm text-green-600 dark:text-green-400 font-bold">${student.lifetime_points} Pts</p>
        </div>
    `).join('');
    topChampionsList.innerHTML = champions;

    // 2. All Students
    allStudentsTableBody.innerHTML = '';
    const filteredStudents = state.allStudents.filter(s => 
        s.name.toLowerCase().includes(searchTerm) || 
        s.student_id.toLowerCase().includes(searchTerm)
    );

    const studentRows = filteredStudents.map(student => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td>
                <div class="flex items-center">
                    <img src="${student.avatar_url || 'https://placehold.co/40x40/gray/white?text=S'}" class="w-8 h-8 rounded-full mr-3">
                    <div>
                        <p class="font-medium text-gray-900 dark:text-white">${student.name}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${student.email}</p>
                    </div>
                </div>
            </td>
            <td>${student.student_id}</td>
            <td>${student.course}</td>
            <td class="font-medium text-green-600 dark:text-green-400">${student.current_points}</td>
            <td class="font-medium text-blue-600 dark:text-blue-400">${student.lifetime_points}</td>
            <td>${student.is_admin ? '<span class="py-1 px-2 text-xs bg-yellow-400 text-yellow-900 font-bold rounded-full">YES</span>' : 'No'}</td>
            <td>
                <button class="view-student-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700" data-id="${student.student_id}">View</button>
            </td>
        </tr>
    `).join('');
    allStudentsTableBody.innerHTML = studentRows || '<tr><td colspan="7" class="text-center p-4">No students found.</td></tr>';
    
    // Add event listeners for new buttons
    document.querySelectorAll('.view-student-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            renderStudentDetail(e.currentTarget.dataset.id);
            navigateTo('#student-detail');
        });
    });
}

// --- RENDER: STUDENT DETAIL ---
async function renderStudentDetail(studentId) {
    const student = state.allStudents.find(s => s.student_id === studentId);
    if (!student) {
        showToast('Error: Student not found.', 'error');
        navigateTo('#students');
        return;
    }
    
    // Set loading states
    studentDetailName.textContent = 'Loading...';
    studentDetailHistoryTable.innerHTML = '<tr><td colspan="3" class="text-center p-4">Loading...</td></tr>';
    studentDetailRewardsTable.innerHTML = '<tr><td colspan="4" class="text-center p-4">Loading...</td></tr>';
    studentDetailLogsTable.innerHTML = '<tr><td colspan="3" class="text-center p-4">Loading...</td></tr>';
    
    // Set static info
    editStudentBtn.dataset.studentId = student.student_id;
    studentDetailName.textContent = `Student: ${student.name}`;
    studentDetailAvatar.src = student.avatar_url || 'https://placehold.co/80x80/gray/white?text=S';
    studentDetailNameCard.textContent = student.name;
    studentDetailEmail.textContent = student.email;
    studentDetailId.textContent = student.student_id;
    studentDetailCourse.textContent = student.course || 'N/A';
    studentDetailMobile.textContent = student.mobile || 'N/A';
    studentDetailCurrentPts.textContent = student.current_points;
    studentDetailLifetimePts.textContent = student.lifetime_points;
    studentDetailIsAdmin.textContent = student.is_admin ? 'Yes' : 'No';
    studentDetailJoined.textContent = new Date(student.joined_at).toLocaleDateString();

    // Fetch dynamic info
    const [history, rewards, logs] = await Promise.all([
        supabase.from('points_history').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
        supabase.from('user_rewards').select('*, products(name)').eq('student_id', studentId).order('purchase_date', { ascending: false }),
        supabase.from('activity_log').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(100)
    ]);
    
    // Render History
    studentDetailHistoryTable.innerHTML = (history.data || []).map(h => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="text-xs text-gray-500 dark:text-gray-400">${new Date(h.created_at).toLocaleString()}</td>
            <td>${h.description}</td>
            <td class="font-medium ${h.points_change > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}">${h.points_change}</td>
        </tr>
    `).join('') || '<tr><td colspan="3" class="text-center p-4">No transactions found.</td></tr>';
    
    // Render Rewards
    studentDetailRewardsTable.innerHTML = (rewards.data || []).map(r => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="text-xs text-gray-500 dark:text-gray-400">${new Date(r.purchase_date).toLocaleDateString()}</td>
            <td>${r.products.name}</td>
            <td>${r.status === 'active' ? '<span class="py-1 px-2 text-xs bg-green-400 text-green-900 font-bold rounded-full">Active</span>' : '<span class="py-1 px-2 text-xs bg-gray-500 text-gray-900 font-bold rounded-full">Used</span>'}</td>
            <td class="text-xs text-gray-500 dark:text-gray-400">${r.used_date ? new Date(r.used_date).toLocaleDateString() : 'N/A'}</td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="text-center p-4">No rewards found.</td></tr>';

    // Render Logs
    studentDetailLogsTable.innerHTML = (logs.data || []).map(l => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="text-xs text-gray-500 dark:text-gray-400">${new Date(l.created_at).toLocaleString()}</td>
            <td>${l.activity_type.replace(/_/g, ' ')}</td>
            <td class="text-xs">${JSON.stringify(l.details)}</td>
        </tr>
    `).join('') || '<tr><td colspan="3" class="text-center p-4">No activity logs found.</td></tr>';
    
    // Reset to first tab
    studentTabs.forEach((t, i) => {
        t.classList.toggle('active', i === 0);
    });
    studentTabContents.forEach((c, i) => {
        c.classList.toggle('hidden', i !== 0);
    });
}

// --- RENDER: EVENTS ---
function renderEvents() {
    eventsTableBody.innerHTML = '';
    const eventRows = state.allEvents.map(event => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="font-medium text-gray-900 dark:text-white">${event.title}</td>
            <td class="text-gray-600 dark:text-gray-300">${new Date(event.event_date).toLocaleString()}</td>
            <td class="text-green-600 dark:text-green-400 font-medium">${event.points_reward}</td>
            <td class="text-blue-600 dark:text-blue-400 font-medium">${event.event_rsvps[0]?.count || 0}</td>
            <td class="space-x-2">
                <button class="manage-rsvp-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-blue-600 text-white hover:bg-blue-700" data-id="${event.id}">Manage RSVPs</button>
                <button class="edit-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-yellow-500 text-yellow-900 hover:bg-yellow-600" data-type="event" data-id="${event.id}">Edit</button>
                <button class="delete-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-red-600 text-white hover:bg-red-700" data-type="events" data-id="${event.id}">Delete</button>
            </td>
        </tr>
    `).join('');
    eventsTableBody.innerHTML = eventRows || '<tr><td colspan="5" class="text-center p-4">No events found.</td></tr>';

    // Add listeners
    document.querySelectorAll('.manage-rsvp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            renderEventDetail(e.currentTarget.dataset.id);
            navigateTo('#event-detail');
        });
    });
    addCrudListeners(eventsTableBody);
}

// --- RENDER: EVENT DETAIL ---
async function renderEventDetail(eventId) {
    const event = state.allEvents.find(e => e.id == eventId);
    if (!event) return;

    eventDetailTitle.textContent = event.title;
    awardPointsBtn.dataset.eventId = event.id;
    awardPointsBtn.dataset.points = event.points_reward;
    exportRsvpPdfBtn.dataset.eventId = event.id;
    exportAttendancePdfBtn.dataset.eventId = event.id;
    
    rsvpTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Loading RSVPs...</td></tr>';
    
    const { data, error } = await supabase
        .from('event_rsvps')
        .select('*, students(*)')
        .eq('event_id', eventId);
        // .order('created_at'); // <-- FIX: Removed this line
        
    if (error) {
        console.error('Error loading RSVPs:', error);
        rsvpTableBody.innerHTML = `<tr><td colspan="5" class="text-center p-4 text-red-400">Error loading RSVPs. Check RLS policies.</td></tr>`;
        return;
    }
    
    state.currentEventRSVPs = data;
    const rsvpRows = data.map(rsvp => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="font-medium text-gray-900 dark:text-white">${rsvp.students.name}</td>
            <td class="text-gray-600 dark:text-gray-300">${rsvp.student_id}</td>
            <td class="text-gray-600 dark:text-gray-300">${rsvp.students.course}</td>
            <td class="text-gray-500 dark:text-gray-400 text-xs">${new Date(rsvp.created_at).toLocaleDateString()}</td>
            <td class="text-center">
                <input type="checkbox" class="attended-checkbox w-5 h-5 rounded" data-student-id="${rsvp.student_id}">
            </td>
        </tr>
    `).join('');
    rsvpTableBody.innerHTML = rsvpRows || '<tr><td colspan="5" class="text-center p-4">No RSVPs yet.</td></tr>';
}

// --- RENDER: STORE ---
function renderStore() {
    // Stores
    storesTableBody.innerHTML = '';
    const storeRows = state.allStores.map(store => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td><img src="${store.logo_url}" class="w-10 h-10 rounded-lg object-cover"></td>
            <td class="font-medium text-gray-900 dark:text-white">${store.name}</td>
            <td class="space-x-2">
                <button class="edit-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-yellow-500 text-yellow-900 hover:bg-yellow-600" data-type="store" data-id="${store.id}">Edit</button>
                <button class="delete-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-red-600 text-white hover:bg-red-700" data-type="stores" data-id="${store.id}">Delete</button>
            </td>
        </tr>
    `).join('');
    storesTableBody.innerHTML = storeRows || '<tr><td colspan="3" class="text-center p-4">No stores found.</td></tr>';
    
    // Products
    productsTableBody.innerHTML = '';
    const productRows = state.allProducts.map(product => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td><img src="${product.images ? product.images[0] : 'https://placehold.co/40x40/gray/white?text=P'}" class="w-10 h-10 rounded-lg object-cover"></td>
            <td class="font-medium text-gray-900 dark:text-white">${product.name}</td>
            <td>${product.stores?.name || 'N/A'}</td>
            <td class="text-green-600 dark:text-green-400 font-medium">${product.cost_in_points}</td>
            <td class="text-gray-600 dark:text-gray-300">₹${product.discounted_price_inr}</td>
            <td class="space-x-2">
                <button class="edit-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-yellow-500 text-yellow-900 hover:bg-yellow-600" data-type="product" data-id="${product.id}">Edit</button>
                <button class="delete-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-red-600 text-white hover:bg-red-700" data-type="products" data-id="${product.id}">Delete</button>
            </td>
        </tr>
    `).join('');
    productsTableBody.innerHTML = productRows || '<tr><td colspan="6" class="text-center p-4">No products found.</td></tr>';

    addCrudListeners(storesTableBody);
    addCrudListeners(productsTableBody);
}

// --- RENDER: CONTENT (CHALLENGES & LEVELS) ---
function renderContent() {
    // Challenges
    challengesTableBody.innerHTML = '';
    const challengeRows = state.allChallenges.map(c => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td><i data-lucide="${c.icon}" class="w-5 h-5 text-yellow-500 dark:text-yellow-400"></i></td>
            <td class="font-medium text-gray-900 dark:text-white">${c.title}</td>
            <td class="text-green-600 dark:text-green-400 font-medium">${c.points_reward}</td>
            <td>${c.is_daily ? 'Yes' : 'No'}</td>
            <td class="space-x-2">
                <button class="edit-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-yellow-500 text-yellow-900 hover:bg-yellow-600" data-type="challenge" data-id="${c.id}">Edit</button>
                <button class="delete-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-red-600 text-white hover:bg-red-700" data-type="challenges" data-id="${c.id}">Delete</button>
            </td>
        </tr>
    `).join('');
    challengesTableBody.innerHTML = challengeRows || '<tr><td colspan="5" class="text-center p-4">No challenges found.</td></tr>';
    lucide.createIcons();
    
    // Levels
    levelsTableBody.innerHTML = '';
    const levelRows = state.allLevels.map(l => `
        <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
            <td class="font-bold text-lg text-gray-900 dark:text-white">${l.level_number}</td>
            <td class="font-medium text-gray-900 dark:text-white">${l.title}</td>
            <td class="text-blue-600 dark:text-blue-400 font-medium">${l.min_points}</td>
            <td class="space-x-2">
                <button class="edit-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-yellow-500 text-yellow-900 hover:bg-yellow-600" data-type="level" data-id="${l.id}">Edit</button>
                <button class="delete-btn py-1 px-2 text-xs font-medium rounded-md transition-colors bg-red-600 text-white hover:bg-red-700" data-type="levels" data-id="${l.id}">Delete</button>
            </td>
        </tr>
    `).join('');
    levelsTableBody.innerHTML = levelRows || '<tr><td colspan="4" class="text-center p-4">No levels found.</td></tr>';
    
    addCrudListeners(challengesTableBody);
    addCrudListeners(levelsTableBody);
}

// --- CRUD & ACTIONS ---

function addCrudListeners(tableBody) {
    // Edit Buttons
    tableBody.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.currentTarget.dataset.type;
            const id = e.currentTarget.dataset.id;
            let item;
            switch(type) {
                case 'student': item = state.allStudents.find(i => i.student_id == id); break;
                case 'event': item = state.allEvents.find(i => i.id == id); break;
                case 'store': item = state.allStores.find(i => i.id == id); break;
                case 'product': item = state.allProducts.find(i => i.id == id); break;
                case 'challenge': item = state.allChallenges.find(i => i.id == id); break;
                case 'level': item = state.allLevels.find(i => i.id == id); break;
            }
            if(item) openModal(type, item);
        });
    });

    // Delete Buttons
    tableBody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const type = e.currentTarget.dataset.type; // This is the table name
            const id = e.currentTarget.dataset.id;
            
            if (confirm(`Are you sure you want to delete this item? This cannot be undone.`)) {
                try {
                    const { error } = await supabase.from(type).delete().match({ id: id });
                    if (error) throw error;
                    showToast('Item deleted successfully!', 'success');
                    await loadInitialData(); // Reload all data
                } catch (err) {
                    alert(`Error deleting: ${err.message}`);
                }
            }
        });
    });
}

async function handleAwardEventPoints(e) {
    const eventId = e.currentTarget.dataset.eventId;
    const points = parseInt(e.currentTarget.dataset.points, 10);
    const event = state.allEvents.find(e => e.id == eventId);
    
    if (!event || !points) {
        alert("Error: Event details not found.");
        return;
    }

    const attendedCheckboxes = document.querySelectorAll('.attended-checkbox:checked');
    if (attendedCheckboxes.length === 0) {
        alert("Please select at least one student who attended.");
        return;
    }
    
    if (!confirm(`This will award ${points} points to ${attendedCheckboxes.length} student(s). Are you sure?`)) {
        return;
    }
    
    const records = Array.from(attendedCheckboxes).map(cb => ({
        student_id: cb.dataset.studentId,
        points_change: points,
        description: `Attended: ${event.title}`,
        type: 'event'
    }));

    try {
        const { error } = await supabase.from('points_history').insert(records);
        if (error) throw error;
        
        showToast(`Awarded points to ${records.length} student(s).`, 'success');
        await loadInitialData(); // Refresh dashboard stats
        
    } catch (err) {
        alert(`Error awarding points: ${err.message}`);
    }
}

async function exportEventData(type) {
    const eventId = exportRsvpPdfBtn.dataset.eventId; // Both buttons have it
    const event = state.allEvents.find(e => e.id == eventId);
    if (!event) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    let title, data, head;
    const studentsToExport = (type === 'rsvp')
        ? state.currentEventRSVPs // All RSVPs
        : state.currentEventRSVPs.filter(rsvp => // Only attended
            document.querySelector(`.attended-checkbox[data-student-id="${rsvp.student_id}"]`).checked
          );
    
    if (type === 'rsvp') {
        title = `RSVP List: ${event.title}`;
        head = [['Name', 'Student ID', 'Course', 'Email']];
        data = studentsToExport.map(rsvp => [
            rsvp.students.name,
            rsvp.student_id,
            rsvp.students.course,
            rsvp.students.email
        ]);
    } else {
        title = `Attendance List: ${event.title}`;
        head = [['Name', 'Student ID', 'Course', 'Email']];
        data = studentsToExport.map(rsvp => [
            rsvp.students.name,
            rsvp.student_id,
            rsvp.students.course,
            rsvp.students.email
        ]);
    }

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(`Total: ${data.length} student(s)`, 14, 30);
    
    doc.autoTable({
        startY: 35,
        head: head,
        body: data,
        theme: 'striped'
    });
    
    doc.save(`${type}_list_${event.id}.pdf`);
}

// --- MODAL & FORM LOGIC ---

// NEW: Helper function for product modal listeners
function setupProductModalListeners() {
    const addFeatureBtn = document.getElementById('add-feature-btn');
    const featureInput = document.getElementById('form-feature-input');
    const featureContainer = document.getElementById('feature-tags-container');

    const addSpecBtn = document.getElementById('add-spec-btn');
    const specContainer = document.getElementById('spec-pairs-container');

    // --- Features ---
    const addFeatureTag = (feature) => {
        if (!feature.trim()) return;
        const tag = document.createElement('span');
        tag.className = "feature-tag bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-sm px-3 py-1 rounded-full flex items-center";
        tag.innerHTML = `
            <span class="feature-value">${feature}</span>
            <button type="button" class="remove-tag-btn ml-2 text-blue-600 dark:text-blue-300">&times;</button>
        `;
        tag.querySelector('.remove-tag-btn').addEventListener('click', () => tag.remove());
        featureContainer.appendChild(tag);
    };

    if (addFeatureBtn) {
        addFeatureBtn.addEventListener('click', () => {
            addFeatureTag(featureInput.value);
            featureInput.value = '';
        });
    }
    // Add listener to existing tags
    if (featureContainer) {
        featureContainer.querySelectorAll('.remove-tag-btn').forEach(btn => {
            btn.addEventListener('click', () => btn.closest('.feature-tag').remove());
        });
    }

    // --- Specifications ---
    const addSpecPair = (key = '', value = '') => {
        const pair = document.createElement('div');
        pair.className = "spec-pair flex space-x-2";
        pair.innerHTML = `
            <input type="text" class="spec-key w-1/3 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-300 dark:border-gray-600" value="${key}" placeholder="e.g. Color">
            <input type="text" class="spec-value w-2/3 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-300 dark:border-gray-600" value="${value}" placeholder="e.g. Red">
            <button type="button" class="remove-pair-btn bg-red-600 text-white px-3 py-1 rounded-lg text-sm">-</button>
        `;
        pair.querySelector('.remove-pair-btn').addEventListener('click', () => pair.remove());
        specContainer.appendChild(pair);
    };
    
    if (addSpecBtn) {
        addSpecBtn.addEventListener('click', () => addSpecPair());
    }
    // Add listener to existing pairs
    if (specContainer) {
        specContainer.querySelectorAll('.remove-pair-btn').forEach(btn => {
            btn.addEventListener('click', () => btn.closest('.spec-pair').remove());
        });
    }
}

function getFormFields(type, data = {}) {
    // Helper to get value or default
    const val = (key, def = '') => (data ? data[key] : def) ?? def;

    // Helper for generating image upload field
    const imgField = (label, key, isMultiple = false) => {
        const rawValue = val(key);
        let imageArray = [];
        let hiddenValue = '[]';

        if (isMultiple) {
            imageArray = Array.isArray(rawValue) ? rawValue : [];
            hiddenValue = JSON.stringify(imageArray);
        } else {
            imageArray = rawValue ? [rawValue] : [];
            hiddenValue = rawValue || ''; // Store single URL as string
        }

        return `
        <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${label}</label>
            <input type="file" class="file-input w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700" data-key="${key}" ${isMultiple ? 'multiple' : ''}>
            <input type="hidden" id="form-${key}" value='${hiddenValue}'>
            <div id="image-preview-${key}" class="mt-2 flex space-x-2">
                ${imageArray.map(img => 
                    img ? `<img src="${img}" class="w-16 h-16 rounded-lg object-cover">` : ''
                ).join('')}
            </div>
        </div>
        `;
    };

    // Helper for input fields
    const inputField = (label, key, type = 'text', readonly = false, extraClasses = '') => `
        <div>
            <label class="block text-sm">${label}</label>
            <input type="${type}" id="form-${key}" value="${val(key)}" 
                   class="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-300 dark:border-gray-600 ${extraClasses}"
                   ${readonly ? 'readonly' : ''}>
        </div>
    `;
    const textareaField = (label, key, rows = 3) => `
        <div class="col-span-2">
            <label class="block text-sm">${label}</label>
            <textarea id="form-${key}" rows="${rows}" class="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-300 dark:border-gray-600">${val(key)}</textarea>
        </div>
    `;

    switch(type) {
        case 'student':
            return `
                <input type="hidden" id="form-student_id" value="${val('student_id')}">
                <div class="grid grid-cols-2 gap-4">
                    ${inputField('Name', 'name')}
                    ${inputField('Email', 'email', 'email', true, 'bg-gray-200 dark:bg-gray-800')}
                    ${inputField('Course', 'course')}
                    ${inputField('Mobile', 'mobile', 'tel')}
                    ${inputField('Current Points', 'current_points', 'number')}
                    ${inputField('Lifetime Points', 'lifetime_points', 'number')}
                    <div class="col-span-2"><label class="flex items-center space-x-2"><input type="checkbox" id="form-is_admin" ${val('is_admin') ? 'checked' : ''} class="w-4 h-4 rounded"><span>Is Administrator</span></label></div>
                </div>
            `;
        case 'event':
            return `
                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2">${inputField('Title', 'title')}</div>
                    ${inputField('Event Date & Time', 'event_date', 'datetime-local', false, 'dark:text-gray-300')}
                    ${inputField('Points Reward', 'points_reward', 'number')}
                    ${textareaField('Description', 'description')}
                </div>
            `;
        case 'store':
            return `
                <div class="grid grid-cols-2 gap-4">
                    ${inputField('Store Name', 'name')}
                    ${imgField('Logo URL', 'logo_url', false)}
                </div>
            `;
        case 'product':
            const features = val('features', []);
            const specs = val('specifications', {}); // specs is an object

            return `
                <div class="grid grid-cols-2 gap-4">
                    ${inputField('Product Name', 'name')}
                    <div><label class="block text-sm">Store</label>
                        <select id="form-store_id" class="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-300 dark:border-gray-600">
                            ${state.allStores.map(s => `<option value="${s.id}" ${val('store_id') == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                    ${inputField('Cost (Points)', 'cost_in_points', 'number')}
                    ${inputField('Discounted Price (INR)', 'discounted_price_inr', 'number')}
                    ${inputField('Original Price (INR)', 'original_price_inr', 'number')}
                    ${imgField('Product Images (1st is main)', 'images', true)}
                    ${textareaField('Description', 'description')}
                    ${textareaField('Instructions', 'instructions')}
                    
                    <div class="col-span-2">
                        <label class="block text-sm">Features</label>
                        <div class="flex space-x-2">
                            <input type="text" id="form-feature-input" class="w-full bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-300 dark:border-gray-600" placeholder="Add a feature...">
                            <button type="button" id="add-feature-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Add</button>
                        </div>
                        <div id="feature-tags-container" class="flex flex-wrap gap-2 mt-2">
                            ${features.map(f => `
                                <span class="feature-tag bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 text-sm px-3 py-1 rounded-full flex items-center">
                                    <span class="feature-value">${f}</span>
                                    <button type="button" class="remove-tag-btn ml-2 text-blue-600 dark:text-blue-300">&times;</button>
                                </span>
                            `).join('')}
                        </div>
                    </div>

                    <div class="col-span-2">
                        <label class="block text-sm">Specifications</label>
                        <div id="spec-pairs-container" class="space-y-2">
                            ${Object.entries(specs).map(([key, value]) => `
                                <div class="spec-pair flex space-x-2">
                                    <input type="text" class="spec-key w-1/3 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-300 dark:border-gray-600" value="${key}">
                                    <input type="text" class="spec-value w-2/3 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg border border-gray-300 dark:border-gray-600" value="${value}">
                                    <button type="button" class="remove-pair-btn bg-red-600 text-white px-3 py-1 rounded-lg text-sm">-</button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" id="add-spec-btn" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm mt-2">Add Specification</button>
                    </div>
                </div>
            `;
        case 'challenge':
            return `
                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2">${inputField('Title', 'title')}</div>
                    ${inputField('Icon (Lucide Name)', 'icon')}
                    ${inputField('Points Reward', 'points_reward', 'number')}
                    ${textareaField('Description', 'description')}
                    <div class="col-span-2"><label class="flex items-center space-x-2"><input type="checkbox" id="form-is_daily" ${val('is_daily', true) ? 'checked' : ''} class="w-4 h-4 rounded"><span>Is a Daily Challenge</span></label></div>
                </div>
            `;
        case 'level':
            return `
                <div class="grid grid-cols-2 gap-4">
                    ${inputField('Level Number', 'level_number', 'number')}
                    ${inputField('Title', 'title')}
                    <div class="col-span-2">${inputField('Minimum Points', 'min_points', 'number')}</div>
                </div>
            `;
        default: return '<p>Error: Form not found.</p>';
    }
}

function openModal(type, data = null) {
    state.editingItem = data; // Set item being edited (or null for new)
    modalForm.dataset.type = type;
    modalError.textContent = '';
    
    // Set title
    const title = (data ? 'Edit ' : 'Add New ') + type.charAt(0).toUpperCase() + type.slice(1);
    modalTitle.textContent = title;

    // Set body
    modalBody.innerHTML = getFormFields(type, data);
    
    // Add image upload listeners
    modalBody.querySelectorAll('.file-input').forEach(input => {
        input.addEventListener('change', (e) => handleImageUpload(e, input.dataset.key));
    });

    // NEW: Add listeners for dynamic product fields
    if (type === 'product') {
        setupProductModalListeners();
    }

    // Show modal
    modalBackdrop.classList.remove('hidden');
    modalContainer.classList.remove('hidden');
    setTimeout(() => {
        modalBackdrop.classList.remove('opacity-0');
        modalContainer.classList.remove('opacity-0', 'scale-95');
    }, 10);
}

function closeModal() {
    modalBackdrop.classList.add('opacity-0');
    modalContainer.classList.add('opacity-0', 'scale-95');
    setTimeout(() => {
        modalBackdrop.classList.add('hidden');
        modalContainer.classList.add('hidden');
        modalBody.innerHTML = '';
        state.editingItem = null;
    }, 300);
}

async function handleImageUpload(event, key) {
    const file = event.target.files[0];
    if (!file) return;

    const previewContainer = document.getElementById(`image-preview-${key}`);
    const hiddenInput = document.getElementById(`form-${key}`);
    
    // Show temp loader
    previewContainer.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">Uploading...</p>';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_PRESET);

    try {
        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        const newUrl = data.secure_url;
        
        if (key === 'images') { // Handle multiple images
            const existingImages = JSON.parse(hiddenInput.value || '[]');
            existingImages.push(newUrl);
            hiddenInput.value = JSON.stringify(existingImages);
            previewContainer.innerHTML = existingImages.map(img => `<img src="${img}" class="w-16 h-16 rounded-lg object-cover">`).join('');
        } else { // Handle single image (logo_url)
            hiddenInput.value = newUrl;
            previewContainer.innerHTML = `<img src="${newUrl}" class="w-16 h-16 rounded-lg object-cover">`;
        }
        
    } catch (err) {
        console.error(err);
        previewContainer.innerHTML = '<p class="text-sm text-red-400">Upload failed. Please try again.</p>';
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    modalSaveBtn.disabled = true;
    modalError.textContent = '';
    
    const type = e.target.dataset.type;
    let dataObject = {};
    let tableName = type;
    let id = state.editingItem?.id;
    let matchField = 'id';

    // Collect data from form
    try {
        switch(type) {
            case 'student':
                tableName = 'students';
                id = document.getElementById('form-student_id').value;
                matchField = 'student_id';
                dataObject = {
                    name: document.getElementById('form-name').value,
                    course: document.getElementById('form-course').value,
                    mobile: document.getElementById('form-mobile').value,
                    current_points: parseInt(document.getElementById('form-current_points').value, 10),
                    lifetime_points: parseInt(document.getElementById('form-lifetime_points').value, 10),
                    is_admin: document.getElementById('form-is_admin').checked,
                };
                break;
            case 'event':
                tableName = 'events';
                dataObject = {
                    title: document.getElementById('form-title').value,
                    event_date: new Date(document.getElementById('form-event_date').value).toISOString(),
                    points_reward: parseInt(document.getElementById('form-points_reward').value, 10),
                    description: document.getElementById('form-description').value,
                };
                break;
            case 'store':
                tableName = 'stores';
                dataObject = {
                    name: document.getElementById('form-name').value,
                    logo_url: document.getElementById('form-logo_url').value,
                };
                break;
            case 'product':
                tableName = 'products';
                
                // NEW: Parse features from tags
                const featuresArray = [];
                document.querySelectorAll('.feature-tag .feature-value').forEach(tag => {
                    featuresArray.push(tag.textContent);
                });

                // NEW: Parse specifications from key/value pairs
                const specsObject = {};
                document.querySelectorAll('.spec-pair').forEach(pair => {
                    const key = pair.querySelector('.spec-key').value.trim();
                    const value = pair.querySelector('.spec-value').value.trim();
                    if (key) {
                        specsObject[key] = value;
                    }
                });

                dataObject = {
                    name: document.getElementById('form-name').value,
                    store_id: document.getElementById('form-store_id').value,
                    cost_in_points: parseInt(document.getElementById('form-cost_in_points').value, 10),
                    discounted_price_inr: parseInt(document.getElementById('form-discounted_price_inr').value, 10),
                    original_price_inr: parseInt(document.getElementById('form-original_price_inr').value, 10),
                    images: JSON.parse(document.getElementById('form-images').value || '[]'),
                    description: document.getElementById('form-description').value,
                    instructions: document.getElementById('form-instructions').value,
                    features: featuresArray,
                    specifications: specsObject
                };
                break;
            case 'challenge':
                tableName = 'challenges';
                dataObject = {
                    title: document.getElementById('form-title').value,
                    icon: document.getElementById('form-icon').value,
                    points_reward: parseInt(document.getElementById('form-points_reward').value, 10),
                    description: document.getElementById('form-description').value,
                    is_daily: document.getElementById('form-is_daily').checked,
                };
                break;
            case 'level':
                tableName = 'levels';
                dataObject = {
                    level_number: parseInt(document.getElementById('form-level_number').value, 10),
                    title: document.getElementById('form-title').value,
                    min_points: parseInt(document.getElementById('form-min_points').value, 10),
                };
                break;
        }

        let query;
        if (state.editingItem) {
            // Update
            query = supabase.from(tableName).update(dataObject).match({ [matchField]: id });
        } else {
            // Insert
            query = supabase.from(tableName).insert(dataObject);
        }

        const { error } = await query;
        if (error) throw error;

        showToast(`${type} saved successfully!`, 'success');
        closeModal();
        await loadInitialData(); // Reload all data

    } catch (err) {
        console.error("Form submit error:", err);
        modalError.textContent = `Error: ${err.message}`;
    } finally {
        modalSaveBtn.disabled = false;
    }
}

// --- UTILITIES ---
function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    
    // Reset classes
    toast.classList.remove('bg-green-500', 'bg-red-500', 'translate-x-full');
    
    if (type === 'error') {
        toast.classList.add('bg-red-500');
    } else {
        toast.classList.add('bg-green-500');
    }
    
    // Animate in
    toast.classList.remove('translate-x-full');
    
    // Animate out after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-x-full');
    }, 3000);
}

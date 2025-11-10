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
};

// --- DOM ELEMENTS ---
const loader = document.getElementById('app-loader');
const allPages = document.querySelectorAll('.page');
const sidebarLinks = document.querySelectorAll('.sidebar-link');
const logoutButton = document.getElementById('logout-button');
const adminAvatar = document.getElementById('admin-avatar');
const adminName = document.getElementById('admin-name');

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

        state.allStudents = students.data;
        state.allHistory = history.data;
        state.allActivity = activity.data;
        state.allEvents = events.data;
        state.allStores = stores.data;
        state.allProducts = products.data;
        state.allChallenges = challenges.data;
        state.allLevels = levels.data;

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

    // Sidebar Navigation
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const hash = link.hash;
            navigateTo(hash);
        });
    });
    
    // Back Buttons
    document.querySelectorAll('.back-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            navigateTo(`#${e.currentTarget.dataset.target}`);
        });
    });

    // Student Detail Tabs
    studentTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = e.currentTarget.dataset.tab;
            studentTabs.forEach(t => t.classList.remove('active', 'text-white'));
            e.currentTarget.classList.add('active', 'text-white');

            studentTabContents.forEach(c => c.classList.add('hidden'));
            document.getElementById(`tab-${targetTab}`).classList.remove('hidden');
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
            const modalType = e.currentTarget.dataset.modal.replace('modal-', '');
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
    statCo2Saved.textContent = `${(totalDistributed * 0.8).toFixed(1)} kg`;
    statItemsRecycled.textContent = state.allHistory.filter(h => h.description.toLowerCase().includes('submitted')).length;
    statEventsAttended.textContent = state.allHistory.filter(h => h.description.toLowerCase().includes('attended')).length;

    // 3. Analytics Charts
    renderAnalyticsCharts();
    
    // 4. Activity Feed
    activityLogFeed.innerHTML = '';
    const feed = state.allActivity.slice(0, 50).map(log => {
        let details = '';
        if (log.details && log.details.page) details = `(Page: ${log.details.page})`;
        if (log.details && log.details.action) details = `(Action: ${log.details.action})`;

        return `
            <div class="py-2 px-3 border-b border-gray-700 last:border-b-0">
                <p class="text-sm text-gray-200">
                    <span class="font-semibold text-green-400">${log.student_id}</span>
                    ${log.activity_type.replace(/_/g, ' ')} ${details}
                </p>
                <p class="text-xs text-gray-500">${new Date(log.created_at).toLocaleString()}</p>
            </div>
        `;
    }).join('');
    activityLogFeed.innerHTML = feed || '<p class="text-gray-400 text-center p-4">No activity found.</p>';
}

function renderAnalyticsCharts() {
    // Page View Distribution
    const pageViews = state.allActivity
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
            plugins: { legend: { labels: { color: '#9ca3af' } } }
        }
    });

    // Views Over Time (by Day for last 30 days)
    const viewsByDay = state.allActivity
        .filter(log => log.activity_type === 'page_view')
        .reduce((acc, log) => {
            const day = new Date(log.created_at).toISOString().split('T')[0];
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});
    
    const last30Days = [...Array(30).keys()].map(i => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d.toISOString().split('T')[0];
    }).reverse();

    if (state.viewsOverTimeChart) state.viewsOverTimeChart.destroy();
    state.viewsOverTimeChart = new Chart(viewsOverTimeCtx, {
        type: 'bar',
        data: {
            labels: last30Days,
            datasets: [{
                label: 'Total Page Views',
                data: last30Days.map(day => viewsByDay[day] || 0),
                backgroundColor: '#059669',
                borderColor: '#10B981',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
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
        <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 text-center">
            <span class="text-2xl font-bold ${index === 0 ? 'text-yellow-400' : (index === 1 ? 'text-gray-300' : (index === 2 ? 'text-yellow-600' : 'text-gray-400'))}">
                #${index + 1}
            </span>
            <img src="${student.avatar_url || 'https://placehold.co/80x80/gray/white?text=S'}" class="w-16 h-16 rounded-full mx-auto my-2 border-2 ${index === 0 ? 'border-yellow-400' : 'border-gray-600'}">
            <p class="font-semibold text-white truncate">${student.name}</p>
            <p class="text-sm text-green-400 font-bold">${student.lifetime_points} Pts</p>
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
        <tr class="hover:bg-gray-700">
            <td>
                <div class="flex items-center">
                    <img src="${student.avatar_url || 'https://placehold.co/40x40/gray/white?text=S'}" class="w-8 h-8 rounded-full mr-3">
                    <div>
                        <p class="font-medium text-white">${student.name}</p>
                        <p class="text-xs text-gray-400">${student.email}</p>
                    </div>
                </div>
            </td>
            <td>${student.student_id}</td>
            <td>${student.course}</td>
            <td class="font-medium text-green-400">${student.current_points}</td>
            <td class="font-medium text-blue-400">${student.lifetime_points}</td>
            <td>${student.is_admin ? '<span class="py-1 px-2 text-xs bg-yellow-400 text-yellow-900 font-bold rounded-full">YES</span>' : 'No'}</td>
            <td>
                <button class="view-student-btn action-btn bg-blue-600 text-white hover:bg-blue-700" data-id="${student.student_id}">View</button>
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
    studentDetailHistoryTable.innerHTML = history.data.map(h => `
        <tr>
            <td class="text-xs text-gray-400">${new Date(h.created_at).toLocaleString()}</td>
            <td>${h.description}</td>
            <td class="font-medium ${h.points_change > 0 ? 'text-green-400' : 'text-red-400'}">${h.points_change}</td>
        </tr>
    `).join('') || '<tr><td colspan="3" class="text-center p-4">No transactions found.</td></tr>';
    
    // Render Rewards
    studentDetailRewardsTable.innerHTML = rewards.data.map(r => `
        <tr>
            <td class="text-xs text-gray-400">${new Date(r.purchase_date).toLocaleDateString()}</td>
            <td>${r.products.name}</td>
            <td>${r.status === 'active' ? '<span class="py-1 px-2 text-xs bg-green-400 text-green-900 font-bold rounded-full">Active</span>' : '<span class="py-1 px-2 text-xs bg-gray-500 text-gray-900 font-bold rounded-full">Used</span>'}</td>
            <td class="text-xs text-gray-400">${r.used_date ? new Date(r.used_date).toLocaleDateString() : 'N/A'}</td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="text-center p-4">No rewards found.</td></tr>';

    // Render Logs
    studentDetailLogsTable.innerHTML = logs.data.map(l => `
        <tr>
            <td class="text-xs text-gray-400">${new Date(l.created_at).toLocaleString()}</td>
            <td>${l.activity_type.replace(/_/g, ' ')}</td>
            <td class="text-xs">${JSON.stringify(l.details)}</td>
        </tr>
    `).join('') || '<tr><td colspan="3" class="text-center p-4">No activity logs found.</td></tr>';
    
    // Reset to first tab
    studentTabs.forEach((t, i) => t.classList.toggle('active', i === 0).classList.toggle('text-white', i === 0));
    studentTabContents.forEach((c, i) => c.classList.toggle('hidden', i !== 0));
}

// --- RENDER: EVENTS ---
function renderEvents() {
    eventsTableBody.innerHTML = '';
    const eventRows = state.allEvents.map(event => `
        <tr>
            <td class="font-medium text-white">${event.title}</td>
            <td class="text-gray-300">${new Date(event.event_date).toLocaleString()}</td>
            <td class="text-green-400 font-medium">${event.points_reward}</td>
            <td class="text-blue-400 font-medium">${event.event_rsvps[0]?.count || 0}</td>
            <td class="space-x-2">
                <button class="manage-rsvp-btn action-btn bg-blue-600 text-white hover:bg-blue-700" data-id="${event.id}">Manage RSVPs</button>
                <button class="edit-btn action-btn bg-yellow-500 text-yellow-900 hover:bg-yellow-600" data-type="event" data-id="${event.id}">Edit</button>
                <button class="delete-btn action-btn bg-red-600 text-white hover:bg-red-700" data-type="events" data-id="${event.id}">Delete</button>
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
        .eq('event_id', eventId)
        .order('created_at');
        
    if (error) {
        rsvpTableBody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-red-400">Error loading RSVPs.</td></tr>';
        return;
    }
    
    state.currentEventRSVPs = data;
    const rsvpRows = data.map(rsvp => `
        <tr>
            <td class="font-medium text-white">${rsvp.students.name}</td>
            <td class="text-gray-300">${rsvp.student_id}</td>
            <td class="text-gray-300">${rsvp.students.course}</td>
            <td class="text-gray-400 text-xs">${new Date(rsvp.created_at).toLocaleDateString()}</td>
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
        <tr>
            <td><img src="${store.logo_url}" class="w-10 h-10 rounded-lg object-cover"></td>
            <td class="font-medium text-white">${store.name}</td>
            <td class="space-x-2">
                <button class="edit-btn action-btn bg-yellow-500 text-yellow-900 hover:bg-yellow-600" data-type="store" data-id="${store.id}">Edit</button>
                <button class="delete-btn action-btn bg-red-600 text-white hover:bg-red-700" data-type="stores" data-id="${store.id}">Delete</button>
            </td>
        </tr>
    `).join('');
    storesTableBody.innerHTML = storeRows || '<tr><td colspan="3" class="text-center p-4">No stores found.</td></tr>';
    
    // Products
    productsTableBody.innerHTML = '';
    const productRows = state.allProducts.map(product => `
        <tr>
            <td><img src="${product.images ? product.images[0] : 'https://placehold.co/40x40/gray/white?text=P'}" class="w-10 h-10 rounded-lg object-cover"></td>
            <td class="font-medium text-white">${product.name}</td>
            <td>${product.stores?.name || 'N/A'}</td>
            <td class="text-green-400 font-medium">${product.cost_in_points}</td>
            <td class="text-gray-300">₹${product.discounted_price_inr}</td>
            <td class="space-x-2">
                <button class="edit-btn action-btn bg-yellow-500 text-yellow-900 hover:bg-yellow-600" data-type="product" data-id="${product.id}">Edit</button>
                <button class="delete-btn action-btn bg-red-600 text-white hover:bg-red-700" data-type="products" data-id="${product.id}">Delete</button>
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
        <tr>
            <td><i data-lucide="${c.icon}" class="w-5 h-5 text-yellow-400"></i></td>
            <td class="font-medium text-white">${c.title}</td>
            <td class="text-green-400 font-medium">${c.points_reward}</td>
            <td>${c.is_daily ? 'Yes' : 'No'}</td>
            <td class="space-x-2">
                <button class="edit-btn action-btn bg-yellow-500 text-yellow-900 hover:bg-yellow-600" data-type="challenge" data-id="${c.id}">Edit</button>
                <button class="delete-btn action-btn bg-red-600 text-white hover:bg-red-700" data-type="challenges" data-id="${c.id}">Delete</button>
            </td>
        </tr>
    `).join('');
    challengesTableBody.innerHTML = challengeRows || '<tr><td colspan="5" class="text-center p-4">No challenges found.</td></tr>';
    lucide.createIcons();
    
    // Levels
    levelsTableBody.innerHTML = '';
    const levelRows = state.allLevels.map(l => `
        <tr>
            <td class="font-bold text-lg text-white">${l.level_number}</td>
            <td class="font-medium text-white">${l.title}</td>
            <td class="text-blue-400 font-medium">${l.min_points}</td>
            <td class="space-x-2">
                <button class="edit-btn action-btn bg-yellow-500 text-yellow-900 hover:bg-yellow-600" data-type="level" data-id="${l.id}">Edit</button>
                <button class="delete-btn action-btn bg-red-600 text-white hover:bg-red-700" data-type="levels" data-id="${l.id}">Delete</button>
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
                    // *** THIS IS THE CORRECTED LINE ***
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

function getFormFields(type, data = {}) {
    // Helper to get value or default
    const val = (key, def = '') => data[key] || def;

    // Helper for generating image upload field
    const imgField = (label, key) => `
        <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-300 mb-1">${label}</label>
            <input type="file" class="file-input w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700" data-key="${key}">
            <input type="hidden" id="form-${key}" value="${val(key, '[]')}">
            <div id="image-preview-${key}" class="mt-2 flex space-x-2">
                ${(Array.isArray(val(key)) ? val(key) : [val(key)]).map(img => 
                    img ? `<img src="${img}" class="w-16 h-16 rounded-lg object-cover">` : ''
                ).join('')}
            </div>
        </div>
    `;

    switch(type) {
        case 'student':
            return `
                <input type="hidden" id="form-student_id" value="${val('student_id')}">
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm">Name</label><input type="text" id="form-name" value="${val('name')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Email</label><input type="email" id="form-email" value="${val('email')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600" readonly></div>
                    <div><label class="block text-sm">Course</label><input type="text" id="form-course" value="${val('course')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Mobile</label><input type="text" id="form-mobile" value="${val('mobile')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Current Points</label><input type="number" id="form-current_points" value="${val('current_points')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Lifetime Points</label><input type="number" id="form-lifetime_points" value="${val('lifetime_points')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div class="col-span-2"><label class="flex items-center space-x-2"><input type="checkbox" id="form-is_admin" ${val('is_admin') ? 'checked' : ''} class="w-4 h-4 rounded"><span>Is Administrator</span></label></div>
                </div>
            `;
        case 'event':
            return `
                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2"><label class="block text-sm">Title</label><input type="text" id="form-title" value="${val('title')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Event Date & Time</label><input type="datetime-local" id="form-event_date" value="${val('event_date') ? val('event_date').slice(0, 16) : ''}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Points Reward</label><input type="number" id="form-points_reward" value="${val('points_reward')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div class="col-span-2"><label class="block text-sm">Description</label><textarea id="form-description" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600">${val('description')}</textarea></div>
                </div>
            `;
        case 'store':
            return `
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm">Store Name</label><input type="text" id="form-name" value="${val('name')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    ${imgField('Logo URL', 'logo_url')}
                </div>
            `;
        case 'product':
            return `
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm">Product Name</label><input type="text" id="form-name" value="${val('name')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Store</label>
                        <select id="form-store_id" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600">
                            ${state.allStores.map(s => `<option value="${s.id}" ${val('store_id') == s.id ? 'selected' : ''}>${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div><label class="block text-sm">Cost (Points)</label><input type="number" id="form-cost_in_points" value="${val('cost_in_points')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Discounted Price (INR)</label><input type="number" id="form-discounted_price_inr" value="${val('discounted_price_inr')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Original Price (INR)</label><input type="number" id="form-original_price_inr" value="${val('original_price_inr')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    ${imgField('Product Images (1st is main)', 'images')}
                    <div class="col-span-2"><label class="block text-sm">Description</label><textarea id="form-description" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600">${val('description')}</textarea></div>
                    <div class="col-span-2"><label class="block text-sm">Instructions</label><textarea id="form-instructions" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600">${val('instructions')}</textarea></div>
                </div>
            `;
        case 'challenge':
            return `
                <div class="grid grid-cols-2 gap-4">
                    <div class="col-span-2"><label class="block text-sm">Title</label><input type="text" id="form-title" value="${val('title')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Icon (Lucide Name)</label><input type="text" id="form-icon" value="${val('icon')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Points Reward</label><input type="number" id="form-points_reward" value="${val('points_reward')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div class="col-span-2"><label class="block text-sm">Description</label><textarea id="form-description" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600">${val('description')}</textarea></div>
                    <div class="col-span-2"><label class="flex items-center space-x-2"><input type="checkbox" id="form-is_daily" ${val('is_daily', true) ? 'checked' : ''} class="w-4 h-4 rounded"><span>Is a Daily Challenge</span></label></div>
                </div>
            `;
        case 'level':
            return `
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm">Level Number</label><input type="number" id="form-level_number" value="${val('level_number')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div><label class="block text-sm">Title</label><input type="text" id="form-title" value="${val('title')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
                    <div class="col-span-2"><label class="block text-sm">Minimum Points</label><input type="number" id="form-min_points" value="${val('min_points')}" class="w-full bg-gray-700 p-2 rounded-lg border border-gray-600"></div>
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
    previewContainer.innerHTML = '<p class="text-sm text-gray-400">Uploading...</p>';

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
                dataObject = {
                    name: document.getElementById('form-name').value,
                    store_id: document.getElementById('form-store_id').value,
                    cost_in_points: parseInt(document.getElementById('form-cost_in_points').value, 10),
                    discounted_price_inr: parseInt(document.getElementById('form-discounted_price_inr').value, 10),
                    original_price_inr: parseInt(document.getElementById('form-original_price_inr').value, 10),
                    images: JSON.parse(document.getElementById('form-images').value || '[]'),
                    description: document.getElementById('form-description').value,
                    instructions: document.getElementById('form-instructions').value,
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

// ========================================================
// AarogyaPlus - Core Application JavaScript
// 100% English, Profile Management, 3-Hour Booking Validation, AI Search
// ========================================================

const state = {
    currentUser: null,
    doctors: [],
    medicines: [],
    appointments: [],
    selectedSpecialty: 'All',
    selectedCategory: 'All',
    selectedDoctorForBooking: null,
    currentViewingSlip: null
};

// --- DOM Initializer --- //
document.addEventListener('DOMContentLoaded', () => {
    initAuthStatus();
    initSpecialtyFilters();
    initMedicineCategoryFilters();
    loadDoctors();
    loadMedicines();
    loadAppointments();
    setupEventListeners();
    setupDateInput();
});

// --- Date Input Setup (Min Date = Today) --- //
function setupDateInput() {
    const dateInput = document.getElementById('appointmentDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.min = today;
        dateInput.value = today;
    }
}

// --- Event Listeners --- //
function setupEventListeners() {
    // Sliding Auth Panel Toggle
    const signUpButton = document.getElementById('signUpBtn');
    const signInButton = document.getElementById('signInBtn');
    const authContainer = document.getElementById('authContainer');

    if (signUpButton && authContainer) {
        signUpButton.addEventListener('click', () => {
            authContainer.classList.add('right-panel-active');
        });
    }

    if (signInButton && authContainer) {
        signInButton.addEventListener('click', () => {
            authContainer.classList.remove('right-panel-active');
        });
    }

    // Auth Forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Profile Form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSave);
    }

    const profilePicInput = document.getElementById('profilePicInput');
    if (profilePicInput) {
        profilePicInput.addEventListener('input', (e) => {
            const preview = document.getElementById('profileAvatarPreview');
            if (preview && e.target.value.trim()) {
                preview.src = e.target.value.trim();
            }
        });
    }

    // Appointment Booking Form
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }

    // Doctor Search
    const doctorSearchInput = document.getElementById('doctorSearchInput');
    if (doctorSearchInput) {
        doctorSearchInput.addEventListener('input', (e) => {
            loadDoctors(state.selectedSpecialty, e.target.value);
        });
    }

    // Medicine Search
    const medicineSearchInput = document.getElementById('medicineSearchInput');
    let searchDebounceTimer = null;
    if (medicineSearchInput) {
        medicineSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchDebounceTimer);
            const query = e.target.value.trim();
            searchDebounceTimer = setTimeout(() => {
                loadMedicines(state.selectedCategory, query);
            }, 300);
        });
    }

    // Hero quick search
    const heroSearchInput = document.getElementById('heroSearchInput');
    if (heroSearchInput) {
        heroSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performHeroSearch();
            }
        });
    }

    // Symptom Checker Form
    const symptomForm = document.getElementById('symptomForm');
    if (symptomForm) {
        symptomForm.addEventListener('submit', handleSymptomAnalysis);
    }
}

// --- Auth Handling --- //
async function initAuthStatus() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated) {
            state.currentUser = data.user;
            updateAuthUI();
        } else {
            state.currentUser = null;
            updateAuthUI();
        }
    } catch (err) {
        console.error("Auth status error:", err);
    }
}

function updateAuthUI() {
    const authActions = document.getElementById('authActions');
    const userBadge = document.getElementById('userBadge');
    const userNameSpan = document.getElementById('userNameSpan');
    const navUserAvatar = document.getElementById('navUserAvatar');

    if (state.currentUser) {
        if (authActions) authActions.classList.add('hidden');
        if (userBadge) {
            userBadge.classList.remove('hidden');
            if (userNameSpan) userNameSpan.textContent = state.currentUser.name;
            if (navUserAvatar && state.currentUser.profile_pic) {
                navUserAvatar.src = state.currentUser.profile_pic;
            }
        }
        // Pre-fill booking fields if available
        const pName = document.getElementById('patientName');
        const pPhone = document.getElementById('patientPhone');
        if (pName && !pName.value) pName.value = state.currentUser.name;
        if (pPhone && !pPhone.value && state.currentUser.phone) pPhone.value = state.currentUser.phone;
    } else {
        if (authActions) authActions.classList.remove('hidden');
        if (userBadge) userBadge.classList.add('hidden');
    }
}

function openAuthModal(initialMode = 'signin') {
    const modal = document.getElementById('authModalOverlay');
    const container = document.getElementById('authContainer');
    if (!modal || !container) return;

    if (initialMode === 'signup') {
        container.classList.add('right-panel-active');
    } else {
        container.classList.remove('right-panel-active');
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
    const modal = document.getElementById('authModalOverlay');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            state.currentUser = data.user;
            showToast(data.message, 'success');
            updateAuthUI();
            closeAuthModal();
            loadAppointments();
        } else {
            showToast(data.message || 'Login failed. Please verify credentials.', 'error');
        }
    } catch (err) {
        showToast('Unable to connect to the medical server.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value.trim();
    const age = parseInt(document.getElementById('regAge').value) || 28;
    const gender = document.getElementById('regGender').value;

    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, phone, age, gender })
        });
        const data = await res.json();
        if (data.success) {
            state.currentUser = data.user;
            showToast(data.message, 'success');
            updateAuthUI();
            closeAuthModal();
            loadAppointments();
        } else {
            showToast(data.message || 'Registration failed.', 'error');
        }
    } catch (err) {
        showToast('Unable to connect to the medical server.', 'error');
    }
}

async function handleLogout() {
    try {
        const res = await fetch('/api/auth/logout', { method: 'POST' });
        const data = await res.json();
        state.currentUser = null;
        updateAuthUI();
        showToast(data.message || 'You have been logged out.', 'info');
        loadAppointments();
    } catch (err) {
        console.error(err);
    }
}

function fillDemoUser(type = 'patient') {
    if (type === 'patient') {
        document.getElementById('loginEmail').value = 'patient@example.com';
        document.getElementById('loginPassword').value = 'password123';
    } else {
        document.getElementById('loginEmail').value = 'doctor@example.com';
        document.getElementById('loginPassword').value = 'doctor123';
    }
}

// --- User Profile & Medical Records Management --- //
async function openProfileModal() {
    try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        if (!data.success) {
            showToast('Please sign in to manage your medical profile.', 'warning');
            openAuthModal('signin');
            return;
        }

        const p = data.profile;
        document.getElementById('profName').value = p.name || '';
        document.getElementById('profPhone').value = p.phone || '';
        document.getElementById('profAge').value = p.age || 28;
        document.getElementById('profGender').value = p.gender || 'Male';
        document.getElementById('profBloodGroup').value = p.blood_group || 'O+';
        document.getElementById('profEmergencyContact').value = p.emergency_contact || '';
        document.getElementById('profAddress').value = p.address || '';
        document.getElementById('profAllergies').value = p.allergies || 'None reported';
        document.getElementById('profMedicalHistory').value = p.medical_history || 'None';
        
        const avatarUrl = p.profile_pic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
        document.getElementById('profilePicInput').value = avatarUrl;
        document.getElementById('profileAvatarPreview').src = avatarUrl;

        const modal = document.getElementById('profileModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    } catch (err) {
        console.error("Profile load error:", err);
        showToast('Error loading profile.', 'error');
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
}

function selectPresetAvatar(url) {
    document.getElementById('profilePicInput').value = url;
    document.getElementById('profileAvatarPreview').src = url;
}

async function handleProfileSave(e) {
    e.preventDefault();
    const name = document.getElementById('profName').value.trim();
    const phone = document.getElementById('profPhone').value.trim();
    const age = parseInt(document.getElementById('profAge').value) || 28;
    const gender = document.getElementById('profGender').value;
    const profile_pic = document.getElementById('profilePicInput').value.trim();
    const blood_group = document.getElementById('profBloodGroup').value;
    const emergency_contact = document.getElementById('profEmergencyContact').value.trim();
    const address = document.getElementById('profAddress').value.trim();
    const allergies = document.getElementById('profAllergies').value.trim();
    const medical_history = document.getElementById('profMedicalHistory').value.trim();

    try {
        const res = await fetch('/api/user/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name, phone, age, gender, profile_pic,
                blood_group, emergency_contact, address, allergies, medical_history
            })
        });
        const data = await res.json();
        if (data.success) {
            state.currentUser = data.profile;
            updateAuthUI();
            closeProfileModal();
            showToast(data.message, 'success');
        } else {
            showToast(data.message || 'Profile update failed.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast('Server connection error.', 'error');
    }
}

// --- Doctors Section --- //
async function initSpecialtyFilters() {
    try {
        const res = await fetch('/api/specialties');
        const data = await res.json();
        const container = document.getElementById('specialtyFilters');
        if (!container || !data.success) return;

        let html = `
            <button onclick="filterBySpecialty('All', this)" 
                class="spec-btn active px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all bg-sky-500 text-white shadow-md whitespace-nowrap">
                All Specialties
            </button>
        `;

        data.specialties.forEach(s => {
            html += `
                <button onclick="filterBySpecialty('${s.specialty}', this)" 
                    class="spec-btn px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 whitespace-nowrap">
                    ${s.specialty} (${s.count})
                </button>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error("Specialties load error:", err);
    }
}

function filterBySpecialty(specialty, btnElement) {
    state.selectedSpecialty = specialty;
    const buttons = document.querySelectorAll('.spec-btn');
    buttons.forEach(b => {
        b.classList.remove('bg-sky-500', 'text-white', 'shadow-md');
        b.classList.add('bg-slate-800', 'text-slate-300');
    });
    if (btnElement) {
        btnElement.classList.add('bg-sky-500', 'text-white', 'shadow-md');
        btnElement.classList.remove('bg-slate-800', 'text-slate-300');
    }
    loadDoctors(specialty, document.getElementById('doctorSearchInput')?.value || '');
}

async function loadDoctors(specialty = 'All', search = '') {
    const grid = document.getElementById('doctorsGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-400">
            <i class="fa-solid fa-circle-notch fa-spin text-3xl text-sky-400 mb-2"></i>
            <p>Loading medical specialists...</p>
        </div>
    `;

    try {
        let url = `/api/doctors?specialty=${encodeURIComponent(specialty)}&search=${encodeURIComponent(search)}`;
        const res = await fetch(url);
        const data = await res.json();
        state.doctors = data.doctors || [];

        if (state.doctors.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
                    <i class="fa-solid fa-user-doctor text-4xl text-slate-500 mb-3"></i>
                    <p class="text-lg font-medium text-slate-300">No doctors found</p>
                    <p class="text-sm text-slate-400">Try searching for a different specialty or hospital name.</p>
                </div>
            `;
            return;
        }

        let html = '';
        state.doctors.forEach(doc => {
            html += `
                <div class="glass-dark-panel rounded-2xl p-5 hover:border-sky-500/50 transition-all duration-300 flex flex-col justify-between group hover:shadow-2xl hover:shadow-sky-500/10">
                    <div>
                        <div class="flex items-start gap-4">
                            <img src="${doc.image_url}" alt="${doc.name}" 
                                class="w-18 h-18 md:w-20 md:h-20 rounded-2xl object-cover border-2 border-sky-400/40 group-hover:scale-105 transition-transform" />
                            <div class="flex-1 min-w-0">
                                <div class="flex items-center justify-between">
                                    <span class="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30 truncate max-w-[150px]">
                                        ${doc.specialty}
                                    </span>
                                    <div class="flex items-center text-amber-400 text-xs font-bold gap-1">
                                        <i class="fa-solid fa-star"></i>
                                        <span>${doc.rating}</span>
                                        <span class="text-slate-400 font-normal">(${doc.reviews_count})</span>
                                    </div>
                                </div>
                                <h3 class="text-lg font-bold text-white mt-1 group-hover:text-sky-300 transition-colors truncate">
                                    ${doc.name}
                                </h3>
                                <p class="text-xs text-slate-400 font-medium truncate">${doc.qualification}</p>
                                <p class="text-xs text-teal-400 font-semibold mt-1">
                                    <i class="fa-solid fa-award mr-1"></i>${doc.experience_years} Years Experience
                                </p>
                            </div>
                        </div>

                        <div class="mt-4 pt-3 border-t border-slate-700/60 space-y-1.5 text-xs text-slate-300">
                            <p class="flex items-center gap-2 truncate">
                                <i class="fa-solid fa-hospital text-slate-400"></i>
                                <span class="truncate">${doc.hospital}</span>
                            </p>
                            <p class="flex items-center gap-2">
                                <i class="fa-solid fa-calendar-check text-slate-400"></i>
                                <span class="text-slate-300 truncate">${doc.available_days}</span>
                            </p>
                            <p class="text-slate-400 line-clamp-2 mt-2 leading-relaxed">
                                ${doc.bio}
                            </p>
                        </div>
                    </div>

                    <div class="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                        <div>
                            <span class="text-[11px] text-slate-400 block">Consultation Fee</span>
                            <span class="text-lg font-extrabold text-sky-400">₹${doc.consultation_fee}</span>
                        </div>
                        <button onclick="openBookingModal(${doc.id})" 
                            class="px-4 py-2 bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-600 hover:to-teal-600 text-white font-semibold text-xs md:text-sm rounded-xl shadow-lg shadow-sky-500/25 transition-all transform active:scale-95 flex items-center gap-2">
                            <i class="fa-solid fa-calendar-plus"></i>
                            Book Slot
                        </button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-rose-400">Error loading doctor directory.</div>`;
    }
}

// --- 3-HOUR ADVANCE LEAD TIME VALIDATION LOGIC --- //
function parseSlotDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return null;

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();

    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return new Date(year, month - 1, day, hours, minutes, 0);
}

function validateSlotLeadTime() {
    const dateInput = document.getElementById('appointmentDate');
    const selectedSlot = document.getElementById('selectedTimeSlot')?.value;
    const warningBanner = document.getElementById('leadTimeWarningBanner');
    const warningText = document.getElementById('leadTimeWarningText');
    const confirmBtn = document.getElementById('confirmBookingBtn');

    if (!dateInput || !selectedSlot) return true;

    const aptDateTime = parseSlotDateTime(dateInput.value, selectedSlot);
    if (!aptDateTime) return true;

    const now = new Date();
    const diffHours = (aptDateTime - now) / (1000 * 60 * 60);

    if (diffHours < 3.0) {
        if (warningBanner) warningBanner.classList.remove('hidden');
        if (warningText) {
            const timeDesc = diffHours <= 0 ? 'is in the past' : `is only ${Math.round(diffHours * 60)} minutes away`;
            warningText.textContent = `Appointments must be scheduled at least 3 hours in advance. The slot "${selectedSlot}" ${timeDesc}. Please select a later time slot or future date.`;
        }
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        return false;
    } else {
        if (warningBanner) warningBanner.classList.add('hidden');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        return true;
    }
}

// --- Doctor Booking Modal & Logic --- //
function openBookingModal(doctorId) {
    const doc = state.doctors.find(d => d.id === doctorId);
    if (!doc) return;

    state.selectedDoctorForBooking = doc;

    document.getElementById('bookingDoctorId').value = doc.id;
    document.getElementById('modalDocName').textContent = doc.name;
    document.getElementById('modalDocSpec').textContent = `${doc.specialty} • ${doc.qualification}`;
    document.getElementById('modalDocHospital').textContent = doc.hospital;
    document.getElementById('modalDocFee').textContent = `₹${doc.consultation_fee}`;
    document.getElementById('modalDocImg').src = doc.image_url;

    // Reset date to today or tomorrow
    const dateInput = document.getElementById('appointmentDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // Populate Time Slots
    const slotContainer = document.getElementById('timeSlotsContainer');
    slotContainer.innerHTML = '';
    const slots = doc.available_time_slots || ["09:00 AM", "11:00 AM", "02:00 PM", "04:30 PM", "06:00 PM"];
    slots.forEach((slot, index) => {
        const isFirst = index === 0;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `time-slot-btn px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
            isFirst 
            ? 'bg-sky-500 text-white border-sky-400 shadow-md' 
            : 'bg-slate-700/60 text-slate-300 border-slate-600 hover:border-sky-400'
        }`;
        btn.textContent = slot;
        btn.onclick = () => selectTimeSlot(slot, btn);
        slotContainer.appendChild(btn);
    });

    // Set default selected slot
    document.getElementById('selectedTimeSlot').value = slots[0] || "10:00 AM";

    // Auto-fill logged in user info
    if (state.currentUser) {
        document.getElementById('patientName').value = state.currentUser.name || '';
        document.getElementById('patientPhone').value = state.currentUser.phone || '';
        if (state.currentUser.age) document.getElementById('patientAge').value = state.currentUser.age;
        if (state.currentUser.gender) document.getElementById('patientGender').value = state.currentUser.gender;
    }

    validateSlotLeadTime();

    const modal = document.getElementById('bookingModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function selectTimeSlot(slot, btn) {
    document.getElementById('selectedTimeSlot').value = slot;
    document.querySelectorAll('.time-slot-btn').forEach(b => {
        b.classList.remove('bg-sky-500', 'text-white', 'shadow-md');
        b.classList.add('bg-slate-700/60', 'text-slate-300', 'border-slate-600');
    });
    btn.classList.add('bg-sky-500', 'text-white', 'shadow-md');
    btn.classList.remove('bg-slate-700/60', 'text-slate-300');

    validateSlotLeadTime();
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
}

async function handleBookingSubmit(e) {
    e.preventDefault();

    // Verify 3-hour lead time client side before sending
    if (!validateSlotLeadTime()) {
        showToast('Advance Notice Rule: Appointments must be booked at least 3 hours in advance.', 'warning');
        return;
    }

    const doctorId = document.getElementById('bookingDoctorId').value;
    const patientName = document.getElementById('patientName').value.trim();
    const patientPhone = document.getElementById('patientPhone').value.trim();
    const patientAge = parseInt(document.getElementById('patientAge').value) || 25;
    const patientGender = document.getElementById('patientGender').value;
    const appointmentDate = document.getElementById('appointmentDate').value;
    const appointmentTime = document.getElementById('selectedTimeSlot').value;
    const problem = document.getElementById('problemDescription').value.trim();

    if (!doctorId || !patientName || !patientPhone || !appointmentDate || !appointmentTime) {
        showToast('Please fill out all mandatory patient details.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                doctor_id: doctorId,
                patient_name: patientName,
                patient_phone: patientPhone,
                patient_age: patientAge,
                patient_gender: patientGender,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                problem_description: problem
            })
        });

        const data = await res.json();
        if (data.success) {
            closeBookingModal();
            showToast(data.message, 'success');
            loadAppointments();
            openAppointmentPass(data.appointment);
        } else {
            showToast(data.message || 'Booking was not successful.', 'error');
        }
    } catch (err) {
        showToast('Error communicating with appointment server.', 'error');
    }
}

// --- Medicine Directory & AI Universal Search --- //
async function initMedicineCategoryFilters() {
    try {
        const res = await fetch('/api/medicine-categories');
        const data = await res.json();
        const container = document.getElementById('medCategoryFilters');
        if (!container || !data.success) return;

        let html = `
            <button onclick="filterByMedCategory('All', this)" 
                class="med-cat-btn active px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all bg-teal-500 text-white shadow-md whitespace-nowrap">
                All Medications
            </button>
        `;

        data.categories.forEach(cat => {
            html += `
                <button onclick="filterByMedCategory('${cat}', this)" 
                    class="med-cat-btn px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 whitespace-nowrap">
                    ${cat}
                </button>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error("Medicine categories error:", err);
    }
}

function filterByMedCategory(category, btnElement) {
    state.selectedCategory = category;
    const buttons = document.querySelectorAll('.med-cat-btn');
    buttons.forEach(b => {
        b.classList.remove('bg-teal-500', 'text-white', 'shadow-md');
        b.classList.add('bg-slate-800', 'text-slate-300');
    });
    if (btnElement) {
        btnElement.classList.add('bg-teal-500', 'text-white', 'shadow-md');
        btnElement.classList.remove('bg-slate-800', 'text-slate-300');
    }
    loadMedicines(category, document.getElementById('medicineSearchInput')?.value || '');
}

async function loadMedicines(category = 'All', query = '') {
    const grid = document.getElementById('medicinesGrid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-400">
            <i class="fa-solid fa-circle-notch fa-spin text-3xl text-teal-400 mb-2"></i>
            <p>Searching global clinical drug database...</p>
        </div>
    `;

    try {
        let url = `/api/medicines?category=${encodeURIComponent(category)}&q=${encodeURIComponent(query)}`;
        const res = await fetch(url);
        const data = await res.json();
        state.medicines = data.medicines || [];

        if (state.medicines.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-12 bg-slate-800/50 rounded-2xl border border-slate-700">
                    <i class="fa-solid fa-pills text-4xl text-slate-500 mb-3"></i>
                    <p class="text-lg font-medium text-slate-300">No medicine found</p>
                    <p class="text-sm text-slate-400">Try searching for another tablet name e.g., 'Lipitor', 'Ozempic', 'Dolo', 'Augmentin'.</p>
                </div>
            `;
            return;
        }

        let html = '';
        state.medicines.forEach(med => {
            html += `
                <div class="glass-dark-panel rounded-2xl p-5 border border-slate-700/70 hover:border-teal-400/50 transition-all duration-300 flex flex-col justify-between group hover:shadow-2xl hover:shadow-teal-500/10">
                    <div>
                        <div class="flex items-start justify-between gap-2">
                            <span class="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 truncate max-w-[200px]">
                                ${med.category}
                            </span>
                            <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium border border-slate-700">
                                ${med.dosage_form}
                            </span>
                        </div>

                        <div class="mt-3">
                            <h3 class="text-lg font-bold text-white group-hover:text-teal-300 transition-colors">
                                ${med.name}
                            </h3>
                            <p class="text-xs text-sky-400 font-medium mt-0.5 truncate">
                                Formula: ${med.generic_name}
                            </p>
                        </div>

                        <!-- Uses Highlight Box -->
                        <div class="mt-3.5 p-3 rounded-xl bg-teal-950/40 border border-teal-800/40">
                            <span class="text-[11px] font-bold text-teal-300 flex items-center gap-1.5 mb-1">
                                <i class="fa-solid fa-circle-info"></i> What It Is Used For:
                            </span>
                            <p class="text-xs text-teal-100/90 leading-relaxed line-clamp-2">
                                ${med.uses_summary}
                            </p>
                        </div>

                        <p class="text-xs text-slate-400 mt-2.5 line-clamp-2">
                            ${med.uses_detailed}
                        </p>
                    </div>

                    <div class="mt-5 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                        <div>
                            <span class="text-[11px] text-slate-400 block">Average MRP</span>
                            <span class="text-base font-extrabold text-teal-300">₹${med.price.toFixed(2)}</span>
                        </div>
                        <button onclick="openMedicineModal(${med.id})" 
                            class="px-3.5 py-2 bg-gradient-to-r from-teal-500 to-sky-500 hover:from-teal-600 hover:to-sky-600 text-white font-semibold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all transform active:scale-95 flex items-center gap-1.5">
                            <i class="fa-solid fa-book-medical"></i>
                            View Uses & Dosage
                        </button>
                    </div>
                </div>
            `;
        });
        grid.innerHTML = html;
    } catch (err) {
        console.error(err);
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-rose-400">Error retrieving medication index.</div>`;
    }
}

// --- Detailed Medicine Modal (Monograph) --- //
async function openMedicineModal(medId) {
    try {
        const res = await fetch(`/api/medicines/${medId}`);
        const data = await res.json();
        if (!data.success) return;

        const med = data.medicine;

        document.getElementById('medModalName').textContent = med.name;
        document.getElementById('medModalGeneric').textContent = `Active Compound: ${med.generic_name} • Strength: ${med.strength}`;
        document.getElementById('medModalCategory').textContent = med.category;
        document.getElementById('medModalForm').textContent = med.dosage_form;
        document.getElementById('medModalPrice').textContent = `₹${med.price.toFixed(2)}`;
        document.getElementById('medModalManufacturer').textContent = med.manufacturer;

        // Prescription badge
        const rxBadge = document.getElementById('medModalRxBadge');
        if (med.prescription_required) {
            rxBadge.textContent = 'Rx - Prescription Required';
            rxBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30';
        } else {
            rxBadge.textContent = 'OTC - Over The Counter';
            rxBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
        }

        // Detailed Content
        document.getElementById('medModalSummary').textContent = med.uses_summary;
        document.getElementById('medModalDetailed').textContent = med.uses_detailed;
        document.getElementById('medModalDosage').textContent = med.dosage_instructions;
        document.getElementById('medModalHowItWorks').textContent = med.how_it_works;
        document.getElementById('medModalSideEffects').textContent = med.side_effects;
        document.getElementById('medModalPrecautions').textContent = med.precautions;

        const modal = document.getElementById('medicineDetailModal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        document.body.style.overflow = 'hidden';
    } catch (err) {
        console.error(err);
        showToast('Error loading medication monograph.', 'error');
    }
}

function closeMedicineModal() {
    const modal = document.getElementById('medicineDetailModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
}

// --- My Appointments Dashboard --- //
async function loadAppointments() {
    const tableBody = document.getElementById('appointmentsTableBody');
    const emptyState = document.getElementById('appointmentsEmpty');
    const badgeCounter = document.getElementById('appointmentsCountBadge');
    if (!tableBody) return;

    try {
        const res = await fetch('/api/appointments');
        const data = await res.json();
        state.appointments = data.appointments || [];

        if (badgeCounter) {
            badgeCounter.textContent = state.appointments.length;
        }

        if (state.appointments.length === 0) {
            tableBody.innerHTML = '';
            if (emptyState) emptyState.classList.remove('hidden');
            return;
        }

        if (emptyState) emptyState.classList.add('hidden');

        let html = '';
        state.appointments.forEach(apt => {
            const isConfirmed = apt.status === 'Confirmed';
            html += `
                <tr class="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
                    <td class="py-4 px-4 font-mono font-bold text-sky-400 text-xs md:text-sm">
                        ${apt.appointment_number}
                    </td>
                    <td class="py-4 px-4">
                        <div class="font-bold text-white text-sm">${apt.doctor_name}</div>
                        <div class="text-xs text-sky-300">${apt.doctor_specialty}</div>
                        <div class="text-[11px] text-slate-400 truncate max-w-[180px]">${apt.hospital_name}</div>
                    </td>
                    <td class="py-4 px-4 text-xs text-slate-300">
                        <div class="font-semibold text-white">${apt.patient_name}</div>
                        <div class="text-[11px] text-slate-400">${apt.patient_gender}, ${apt.patient_age} yrs • ${apt.patient_phone}</div>
                    </td>
                    <td class="py-4 px-4 text-xs text-slate-200">
                        <div class="font-semibold text-teal-300"><i class="fa-solid fa-calendar mr-1"></i>${apt.appointment_date}</div>
                        <div class="text-[11px] text-slate-400"><i class="fa-solid fa-clock mr-1"></i>${apt.appointment_time}</div>
                    </td>
                    <td class="py-4 px-4">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isConfirmed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }">
                            <i class="fa-solid ${isConfirmed ? 'fa-circle-check' : 'fa-circle-xmark'} mr-1 text-[10px]"></i>
                            ${isConfirmed ? 'Confirmed' : 'Cancelled'}
                        </span>
                    </td>
                    <td class="py-4 px-4 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button onclick='openAppointmentPass(${JSON.stringify(apt)})' 
                                title="Print Receipt"
                                class="p-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 hover:text-white transition-colors">
                                <i class="fa-solid fa-receipt"></i>
                            </button>
                            ${isConfirmed ? `
                                <button onclick="cancelAppointment(${apt.id})" 
                                    title="Cancel Appointment"
                                    class="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-white transition-colors">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });
        tableBody.innerHTML = html;
    } catch (err) {
        console.error("Appointments load error:", err);
    }
}

async function cancelAppointment(id) {
    if (!confirm("Are you sure you wish to cancel this appointment consultation?")) {
        return;
    }

    try {
        const res = await fetch(`/api/appointments/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            showToast(data.message, 'info');
            loadAppointments();
        } else {
            showToast(data.message || 'Unable to cancel appointment.', 'error');
        }
    } catch (err) {
        showToast('Server connection error.', 'error');
    }
}

// --- Printable Hospital Consultation Pass / Slip Modal --- //
function openAppointmentPass(apt) {
    state.currentViewingSlip = apt;

    document.getElementById('slipAptNumber').textContent = apt.appointment_number;
    document.getElementById('slipDoctorName').textContent = apt.doctor_name;
    document.getElementById('slipDoctorSpec').textContent = apt.doctor_specialty;
    document.getElementById('slipHospital').textContent = apt.hospital_name;
    document.getElementById('slipDate').textContent = apt.appointment_date;
    document.getElementById('slipTime').textContent = apt.appointment_time;
    document.getElementById('slipPatientName').textContent = apt.patient_name;
    document.getElementById('slipPatientDetails').textContent = `${apt.patient_gender}, ${apt.patient_age} yrs • Phone: ${apt.patient_phone}`;
    document.getElementById('slipFee').textContent = `₹${apt.fee.toFixed(2)}`;
    document.getElementById('slipStatus').textContent = apt.status;

    const modal = document.getElementById('printableSlipModal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
}

function closeAppointmentPass() {
    const modal = document.getElementById('printableSlipModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.body.style.overflow = '';
    }
}

function printCurrentPass() {
    window.print();
}

// --- Smart Symptom Checker --- //
function setQuickSymptom(text) {
    const input = document.getElementById('symptomInput');
    if (input) {
        input.value = text;
        handleSymptomAnalysis(new Event('submit'));
    }
}

async function handleSymptomAnalysis(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('symptomInput');
    const resultBox = document.getElementById('symptomResultBox');
    const symptoms = input ? input.value.trim() : '';

    if (!symptoms) {
        showToast('Please describe your symptoms.', 'warning');
        return;
    }

    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `
        <div class="text-center py-6 text-slate-400">
            <i class="fa-solid fa-stethoscope fa-spin text-2xl text-teal-400 mb-2"></i>
            <p>Analyzing clinical symptoms and matching specialists...</p>
        </div>
    `;

    try {
        const res = await fetch('/api/symptom-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symptoms })
        });
        const data = await res.json();
        if (!data.success) {
            resultBox.innerHTML = `<p class="text-rose-400">${data.message}</p>`;
            return;
        }

        let html = `
            <div class="p-4 rounded-xl bg-slate-900/90 border border-teal-500/40 space-y-3">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold px-2.5 py-1 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        Recommended Specialist: ${data.recommended_specialties.join(', ')}
                    </span>
                    <span class="text-[11px] text-amber-400"><i class="fa-solid fa-triangle-exclamation mr-1"></i>Preliminary Guidance Only</span>
                </div>
                <p class="text-sm text-slate-200 leading-relaxed bg-slate-800/60 p-3 rounded-lg border border-slate-700">
                    <i class="fa-solid fa-heart-pulse text-teal-400 mr-2"></i>${data.guidance}
                </p>
        `;

        if (data.matched_doctors && data.matched_doctors.length > 0) {
            html += `
                <div>
                    <h4 class="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">Available Board-Certified Specialists:</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            `;
            data.matched_doctors.forEach(doc => {
                html += `
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                        <div class="flex items-center gap-3">
                            <img src="${doc.image_url}" class="w-10 h-10 rounded-full object-cover border border-sky-400" />
                            <div>
                                <h5 class="text-xs font-bold text-white">${doc.name}</h5>
                                <p class="text-[11px] text-slate-400">${doc.hospital}</p>
                            </div>
                        </div>
                        <button onclick="openBookingModal(${doc.id})" class="px-2.5 py-1 bg-sky-500 hover:bg-sky-600 text-white rounded text-xs font-semibold">
                            Book Slot
                        </button>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        if (data.suggested_medicines && data.suggested_medicines.length > 0) {
            html += `
                <div>
                    <h4 class="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">Relevant First-Aid / OTC Formulations:</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            `;
            data.suggested_medicines.forEach(m => {
                html += `
                    <div class="p-2.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-between">
                        <div>
                            <span class="text-xs font-bold text-teal-300 block">${m.name}</span>
                            <span class="text-[11px] text-slate-400">${m.generic_name}</span>
                        </div>
                        <button onclick="openMedicineModal(${m.id})" class="text-xs text-sky-400 hover:underline">
                            View Monograph
                        </button>
                    </div>
                `;
            });
            html += `</div></div>`;
        }

        html += `</div>`;
        resultBox.innerHTML = html;
    } catch (err) {
        console.error(err);
        resultBox.innerHTML = `<p class="text-rose-400">Error analyzing symptoms.</p>`;
    }
}

// --- Hero Search Routing --- //
function performHeroSearch() {
    const query = document.getElementById('heroSearchInput')?.value.trim();
    if (!query) return;

    const medSection = document.getElementById('medicines-section');
    const medInput = document.getElementById('medicineSearchInput');
    if (medInput && medSection) {
        medInput.value = query;
        loadMedicines('All', query);
        medSection.scrollIntoView({ behavior: 'smooth' });
    }
}

function scrollToSection(sectionId) {
    const el = document.getElementById(sectionId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    }
}

// --- Toast Notifications --- //
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
        success: 'bg-emerald-600 border-emerald-400 text-white',
        error: 'bg-rose-600 border-rose-400 text-white',
        warning: 'bg-amber-600 border-amber-400 text-white',
        info: 'bg-sky-600 border-sky-400 text-white'
    };

    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-exclamation',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };

    toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl transition-all duration-300 transform translate-y-2 opacity-0 text-sm font-medium ${colors[type] || colors.info}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type] || icons.info} text-lg"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

/**
 * ==========================================================================
 * KUYAM DEVICE RESERVATION SYSTEM - APPLICATION LOGIC
 * ==========================================================================
 */

// Format Helper to get YYYY-MM-DD
function getFormattedDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

const currentDate = new Date();
const todayString = getFormattedDate(currentDate);
const thisMonthString = todayString.substring(0, 7); // YYYY-MM

// Initial State and Storage Setup
let state = {
    devices: [],
    reservations: []
};

// Demo Data to display immediately on first run
function getDemoData() {
    const demoDevices = [
        { id: "dev-1", name: "CO2 İnkübatörü", brand: "Binder", model: "CB 170", lab: "Kök Hücre" },
        { id: "dev-2", name: "Masaüstü Santrifüj", brand: "Eppendorf", model: "5425 R", lab: "Genel Laboratuvar" },
        { id: "dev-3", name: "HPLC Sistemi", brand: "Agilent", model: "1260 Infinity II", lab: "Biyokimya" },
        { id: "dev-4", name: "Real-Time PCR Cihazı", brand: "Applied Biosystems", model: "QuantStudio 5", lab: "Mikrobiyoloji" },
        { id: "dev-5", name: "Akım Sitometrisi (Flow Cytometer)", brand: "BD Biosciences", model: "FACSCelesta", lab: "Bio-İnovatif" }
    ];

    // Create demo reservations around today's date
    const demoReservations = [
        { id: "res-1", deviceId: "dev-1", user: "Dr. Canan Karatay", date: todayString, start: "09:00", end: "11:30" },
        { id: "res-2", deviceId: "dev-2", user: "Arş. Gör. Melih Bulu", date: todayString, start: "13:00", end: "14:15" },
        { id: "res-3", deviceId: "dev-3", user: "Doç. Dr. Selim Aksoy", date: todayString, start: "10:00", end: "15:00" },
        { id: "res-4", deviceId: "dev-4", user: "Prof. Dr. Leyla Erdi", date: todayString, start: "15:30", end: "18:00" }
    ];

    // Add tomorrow's reservation to demonstrate monthly accumulation
    const tomorrow = new Date();
    tomorrow.setDate(currentDate.getDate() + 1);
    const tomorrowString = getFormattedDate(tomorrow);
    
    demoReservations.push({ 
        id: "res-5", 
        deviceId: "dev-1", 
        user: "Yük. Lis. Öğr. Seda Yılmaz", 
        date: tomorrowString, 
        start: "10:00", 
        end: "14:00" 
    });

    return { devices: demoDevices, reservations: demoReservations };
}

// Save & Load state to Local Storage
function saveToLocalStorage() {
    localStorage.setItem('kuyam_system_data', JSON.stringify(state));
}

function loadState() {
    const savedData = localStorage.getItem('kuyam_system_data');
    if (savedData) {
        try {
            state = JSON.parse(savedData);
        } catch (e) {
            console.error("Failed parsing localStorage data. Initializing demo data.", e);
            state = getDemoData();
            saveToLocalStorage();
        }
    } else {
        state = getDemoData();
        saveToLocalStorage();
    }
}

// --------------------------------------------------------------------------
// TIME AND UTILITY FUNCTIONS
// --------------------------------------------------------------------------

// Convert "HH:MM" to minutes from midnight
function timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

// Calculate duration between start and end (both "HH:MM") in hours
function getDurationHours(start, end) {
    const startM = timeToMinutes(start);
    const endM = timeToMinutes(end);
    if (endM <= startM) return 0;
    return (endM - startM) / 60;
}

// Calculate specific device's daily usage for a given date
function getDailyUsage(deviceId, dateStr) {
    return state.reservations
        .filter(res => res.deviceId === deviceId && res.date === dateStr)
        .reduce((sum, res) => sum + getDurationHours(res.start, res.end), 0);
}

// Calculate specific device's monthly usage for a given month (YYYY-MM)
function getMonthlyUsage(deviceId, monthStr) {
    return state.reservations
        .filter(res => res.deviceId === deviceId && res.date.startsWith(monthStr))
        .reduce((sum, res) => sum + getDurationHours(res.start, res.end), 0);
}

// Check if a new reservation overlaps with existing ones
function checkOverlap(deviceId, date, start, end, excludeResId = null) {
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    
    // Filter other reservations for the same device on the same day
    const sameDayReservations = state.reservations.filter(res => 
        res.deviceId === deviceId && 
        res.date === date && 
        res.id !== excludeResId
    );
    
    for (const res of sameDayReservations) {
        const resStartMin = timeToMinutes(res.start);
        const resEndMin = timeToMinutes(res.end);
        
        // Overlap condition: start1 < end2 && start2 < end1
        if (startMin < resEndMin && resStartMin < endMin) {
            return res; // Return the conflicting reservation
        }
    }
    return null;
}

// Toast notification helper
function showToast(message, type = 'success') {
    // Remove existing toast if visible
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    else if (type === 'info') icon = 'fa-circle-info';
    
    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.add('show'), 50);
    
    // Animate out and remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// --------------------------------------------------------------------------
// MODAL MANAGEMENT
// --------------------------------------------------------------------------
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    
    // Set default dates to today for reservation
    if (modalId === 'booking-modal') {
        document.getElementById('booking-date').value = todayString;
        document.getElementById('booking-start').value = "09:00";
        document.getElementById('booking-end').value = "10:00";
        document.getElementById('booking-error').style.display = 'none';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    
    // Clear forms when closing
    if (modalId === 'device-modal') {
        document.getElementById('device-form').reset();
    } else if (modalId === 'booking-modal') {
        document.getElementById('booking-form').reset();
    }
}

// --------------------------------------------------------------------------
// RENDER UI COMPONENTS
// --------------------------------------------------------------------------

// Update statistics top cards
function renderStats() {
    // Total Devices
    document.getElementById('stat-total-devices').innerText = state.devices.length;
    
    // Active / Future Reservations
    const activeCount = state.reservations.filter(res => res.date >= todayString).length;
    document.getElementById('stat-active-reservations').innerText = activeCount;
    
    // Today's Usage Across all devices
    const todayTotal = state.reservations
        .filter(res => res.date === todayString)
        .reduce((sum, res) => sum + getDurationHours(res.start, res.end), 0);
    document.getElementById('stat-daily-usage').innerText = `${todayTotal.toFixed(1).replace('.0', '')}s`;
    
    // Month's Usage Across all devices
    const monthTotal = state.reservations
        .filter(res => res.date.startsWith(thisMonthString))
        .reduce((sum, res) => sum + getDurationHours(res.start, res.end), 0);
    document.getElementById('stat-monthly-usage').innerText = `${monthTotal.toFixed(1).replace('.0', '')}s`;
}

// Fill device selection dropdown in Reservation Modal
function updateDeviceDropdown() {
    const select = document.getElementById('booking-device');
    select.innerHTML = '<option value="" disabled selected>Cihaz Seçiniz...</option>';
    
    state.devices.forEach(dev => {
        const option = document.createElement('option');
        option.value = dev.id;
        option.textContent = `${dev.name} (${dev.lab})`;
        select.appendChild(option);
    });
}

// Render Device Cards Grid
function renderDevices() {
    const container = document.getElementById('devices-container');
    const searchVal = document.getElementById('device-search').value.toLowerCase();
    const labVal = document.getElementById('lab-filter').value;
    
    // Filter devices based on search inputs
    const filteredDevices = state.devices.filter(dev => {
        const matchesSearch = dev.name.toLowerCase().includes(searchVal) || 
                              dev.brand.toLowerCase().includes(searchVal) || 
                              dev.model.toLowerCase().includes(searchVal);
        const matchesLab = labVal === "" || dev.lab === labVal;
        return matchesSearch && matchesLab;
    });
    
    // Toggle Empty State
    const emptyState = document.getElementById('devices-empty');
    if (filteredDevices.length === 0) {
        emptyState.style.display = 'flex';
        // Remove existing device cards
        const cards = container.querySelectorAll('.device-card');
        cards.forEach(c => c.remove());
        return;
    }
    emptyState.style.display = 'none';
    
    // Keep or recreate cards
    // To be clean and avoid event listener clutter, we reconstruct the container's inner content
    // but keep empty state hidden.
    let htmlContent = '';
    
    filteredDevices.forEach(dev => {
        const dailyHrs = getDailyUsage(dev.id, todayString);
        const monthlyHrs = getMonthlyUsage(dev.id, thisMonthString);
        
        // Progress percentage metrics (Daily out of 8h standard shift, Monthly out of 160h standard month)
        const dailyPercent = Math.min(100, (dailyHrs / 8) * 100);
        const monthlyPercent = Math.min(100, (monthlyHrs / 160) * 100);
        
        // Lab Badge Class mapping
        let badgeClass = 'badge-genel';
        if (dev.lab === 'Kök Hücre') badgeClass = 'badge-kok-hucre';
        else if (dev.lab === 'Biyokimya') badgeClass = 'badge-biyokimya';
        else if (dev.lab === 'Mikrobiyoloji') badgeClass = 'badge-mikrobiyoloji';
        else if (dev.lab === 'Bio-İnovatif') badgeClass = 'badge-bio-inovatif';
        
        htmlContent += `
            <div class="device-card" data-id="${dev.id}">
                <div class="device-card-header">
                    <div class="device-title-area">
                        <h3>${dev.name}</h3>
                        <span class="device-subtitle">${dev.brand} - ${dev.model}</span>
                    </div>
                    <button class="device-delete-btn" onclick="deleteDevice('${dev.id}')" title="Cihazı Sil">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
                <span class="badge ${badgeClass}">${dev.lab}</span>
                
                <div class="device-metrics">
                    <div class="metric-bar-group">
                        <div class="metric-header">
                            <span class="metric-label">Bugün</span>
                            <span class="metric-val">${dailyHrs.toFixed(1).replace('.0', '')}s / 8s</span>
                        </div>
                        <div class="metric-bar-bg">
                            <div class="metric-bar-fill fill-daily" style="width: ${dailyPercent}%"></div>
                        </div>
                    </div>
                    <div class="metric-bar-group">
                        <div class="metric-header">
                            <span class="metric-label">Bu Ay</span>
                            <span class="metric-val">${monthlyHrs.toFixed(1).replace('.0', '')}s / 160s</span>
                        </div>
                        <div class="metric-bar-bg">
                            <div class="metric-bar-fill fill-monthly" style="width: ${monthlyPercent}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Clear and append
    // Save empty state element
    container.innerHTML = '';
    container.appendChild(emptyState);
    container.insertAdjacentHTML('beforeend', htmlContent);
}

// Render Reservations List
function renderReservations() {
    const container = document.getElementById('reservations-container');
    const dateFilterVal = document.getElementById('reservation-date-filter').value;
    
    let filteredReservations = [];
    
    if (dateFilterVal) {
        // Specific date reservations
        filteredReservations = state.reservations.filter(res => res.date === dateFilterVal);
    } else {
        // Active/Upcoming reservations sorted chronologically (showing today and future ones first)
        filteredReservations = state.reservations
            .filter(res => res.date >= todayString)
            .sort((a, b) => {
                if (a.date !== b.date) return a.date.localeCompare(b.date);
                return a.start.localeCompare(b.start);
            });
    }
    
    // Toggle Empty State
    const emptyState = document.getElementById('reservations-empty');
    if (filteredReservations.length === 0) {
        emptyState.style.display = 'flex';
        const items = container.querySelectorAll('.reservation-item');
        items.forEach(i => i.remove());
        return;
    }
    emptyState.style.display = 'none';
    
    let htmlContent = '';
    
    filteredReservations.forEach(res => {
        const device = state.devices.find(d => d.id === res.deviceId);
        const deviceName = device ? device.name : 'Silinmiş Cihaz';
        const deviceLab = device ? device.lab : '';
        
        let badgeClass = 'badge-genel';
        if (deviceLab === 'Kök Hücre') badgeClass = 'badge-kok-hucre';
        else if (deviceLab === 'Biyokimya') badgeClass = 'badge-biyokimya';
        else if (deviceLab === 'Mikrobiyoloji') badgeClass = 'badge-mikrobiyoloji';
        else if (deviceLab === 'Bio-İnovatif') badgeClass = 'badge-bio-inovatif';
        
        // Format Date for Turkish locale
        const dateParts = res.date.split('-');
        const formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
        
        htmlContent += `
            <div class="reservation-item" data-id="${res.id}">
                <div class="res-info">
                    <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                        <span class="res-device-title">${deviceName}</span>
                        ${deviceLab ? `<span class="badge ${badgeClass}" style="transform: scale(0.85); margin-left: -4px;">${deviceLab}</span>` : ''}
                    </div>
                    <div class="res-details">
                        <span class="res-detail-item">
                            <i class="fa-regular fa-calendar"></i> ${formattedDate}
                        </span>
                        <span class="res-detail-item">
                            <i class="fa-regular fa-clock"></i> ${res.start} - ${res.end}
                        </span>
                        <span class="res-detail-item">
                            <i class="fa-regular fa-user"></i> <span class="res-user">${res.user}</span>
                        </span>
                    </div>
                </div>
                <button class="btn btn-icon btn-danger btn-sm" onclick="deleteReservation('${res.id}')" title="Rezervasyonu İptal Et">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;
    });
    
    container.innerHTML = '';
    container.appendChild(emptyState);
    container.insertAdjacentHTML('beforeend', htmlContent);
}

// Full Render Trigger
function updateUI() {
    renderStats();
    updateDeviceDropdown();
    renderDevices();
    renderReservations();
}

// --------------------------------------------------------------------------
// BUSINESS LOGIC ACTIONS (ADD / DELETE)
// --------------------------------------------------------------------------

// Add a Device
function handleDeviceSubmit(event) {
    event.preventDefault();
    
    const name = document.getElementById('device-name').value.trim();
    const brand = document.getElementById('device-brand').value.trim();
    const model = document.getElementById('device-model').value.trim();
    const lab = document.getElementById('device-lab').value;
    
    if (!name || !brand || !model || !lab) {
        showToast("Lütfen tüm alanları doldurun.", "error");
        return;
    }
    
    const newDevice = {
        id: 'dev-' + Date.now(),
        name,
        brand,
        model,
        lab
    };
    
    state.devices.push(newDevice);
    saveToLocalStorage();
    updateUI();
    closeModal('device-modal');
    showToast(`"${name}" başarıyla envantere eklendi.`);
}

// Delete a Device
window.deleteDevice = function(deviceId) {
    const device = state.devices.find(d => d.id === deviceId);
    if (!device) return;
    
    if (confirm(`"${device.name}" cihazını ve bu cihaza ait tüm randevuları silmek istediğinize emin misiniz?`)) {
        // Remove device
        state.devices = state.devices.filter(d => d.id !== deviceId);
        
        // Cascade delete reservations
        state.reservations = state.reservations.filter(res => res.deviceId !== deviceId);
        
        saveToLocalStorage();
        updateUI();
        showToast("Cihaz ve rezervasyonları başarıyla silindi.");
    }
};

// Add a Reservation
function handleBookingSubmit(event) {
    event.preventDefault();
    
    const deviceId = document.getElementById('booking-device').value;
    const user = document.getElementById('booking-user').value.trim();
    const date = document.getElementById('booking-date').value;
    const start = document.getElementById('booking-start').value;
    const end = document.getElementById('booking-end').value;
    
    const errorBanner = document.getElementById('booking-error');
    const errorMsg = document.getElementById('error-message');
    
    if (!deviceId || !user || !date || !start || !end) {
        errorBanner.style.display = 'flex';
        errorMsg.textContent = "Lütfen tüm yıldızlı alanları doldurun.";
        return;
    }
    
    // Check if end time is after start time
    const startMin = timeToMinutes(start);
    const endMin = timeToMinutes(end);
    
    if (endMin <= startMin) {
        errorBanner.style.display = 'flex';
        errorMsg.textContent = "Bitiş saati, başlangıç saatinden sonra olmalıdır.";
        return;
    }
    
    // Check overlaps
    const conflict = checkOverlap(deviceId, date, start, end);
    if (conflict) {
        errorBanner.style.display = 'flex';
        errorMsg.textContent = `Bu saat aralığı ${conflict.user} adına yapılan başka bir rezervasyonla (${conflict.start} - ${conflict.end}) çakışıyor.`;
        return;
    }
    
    const newReservation = {
        id: 'res-' + Date.now(),
        deviceId,
        user,
        date,
        start,
        end
    };
    
    state.reservations.push(newReservation);
    saveToLocalStorage();
    updateUI();
    closeModal('booking-modal');
    showToast("Rezervasyonunuz başarıyla oluşturuldu.");
}

// Delete a Reservation
window.deleteReservation = function(resId) {
    const res = state.reservations.find(r => r.id === resId);
    if (!res) return;
    
    const device = state.devices.find(d => d.id === res.deviceId);
    const deviceName = device ? device.name : 'Bilinmeyen Cihaz';
    
    if (confirm(`"${deviceName}" için ${res.date} tarihindeki rezervasyonu iptal etmek istediğinize emin misiniz?`)) {
        state.reservations = state.reservations.filter(r => r.id !== resId);
        saveToLocalStorage();
        updateUI();
        showToast("Rezervasyon başarıyla iptal edildi.");
    }
};

// --------------------------------------------------------------------------
// JSON EXPORT AND IMPORT HANDLERS
// --------------------------------------------------------------------------

// Export to JSON
function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `kuyam_cihaz_rezervasyon_verileri_${todayString}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
    
    showToast("Veriler JSON olarak başarıyla indirildi.");
}

// Import from JSON
function handleJsonUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            
            // Validation checks
            if (!parsedData || typeof parsedData !== 'object') throw new Error();
            if (!Array.isArray(parsedData.devices) || !Array.isArray(parsedData.reservations)) {
                throw new Error("Geçersiz şema: 'devices' veya 'reservations' dizileri bulunamadı.");
            }
            
            // Deep check formatting
            const validDevices = parsedData.devices.every(d => d.id && d.name && d.brand && d.model && d.lab);
            const validReservations = parsedData.reservations.every(r => r.id && r.deviceId && r.user && r.date && r.start && r.end);
            
            if (!validDevices || !validReservations) {
                throw new Error("Yüklenen verilerin formatı geçersiz veya eksik alanlar içeriyor.");
            }
            
            // Apply loaded state
            state = parsedData;
            saveToLocalStorage();
            updateUI();
            showToast("Veriler başarıyla yüklendi ve güncellendi.");
            
        } catch (err) {
            showToast(err.message || "JSON dosyası okunurken hata oluştu. Geçersiz format.", "error");
        }
        
        // Reset file input value so same file can be uploaded again
        event.target.value = '';
    };
    reader.readAsText(file);
}

// --------------------------------------------------------------------------
// EVENT LISTENERS AND INITIALIZATION
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Load initial state (demo or local)
    loadState();
    
    // Bind buttons
    document.getElementById('btn-open-device-modal').addEventListener('click', () => openModal('device-modal'));
    document.getElementById('btn-open-booking-modal').addEventListener('click', () => openModal('booking-modal'));
    
    document.getElementById('btn-close-device-modal').addEventListener('click', () => closeModal('device-modal'));
    document.getElementById('btn-cancel-device-modal').addEventListener('click', () => closeModal('device-modal'));
    
    document.getElementById('btn-close-booking-modal').addEventListener('click', () => closeModal('booking-modal'));
    document.getElementById('btn-cancel-booking-modal').addEventListener('click', () => closeModal('booking-modal'));
    
    // Empty state quick action bindings
    document.getElementById('btn-empty-add-device').addEventListener('click', () => openModal('device-modal'));
    document.getElementById('btn-empty-add-booking').addEventListener('click', () => openModal('booking-modal'));
    
    // Form submissions
    document.getElementById('device-form').addEventListener('submit', handleDeviceSubmit);
    document.getElementById('booking-form').addEventListener('submit', handleBookingSubmit);
    
    // Search and filters
    document.getElementById('device-search').addEventListener('input', renderDevices);
    document.getElementById('lab-filter').addEventListener('change', renderDevices);
    
    document.getElementById('reservation-date-filter').addEventListener('change', renderReservations);
    document.getElementById('btn-clear-date').addEventListener('click', () => {
        document.getElementById('reservation-date-filter').value = '';
        renderReservations();
    });
    
    // JSON Import/Export
    document.getElementById('btn-export').addEventListener('click', exportData);
    document.getElementById('json-upload').addEventListener('change', handleJsonUpload);
    
    // Initial Render
    updateUI();
});

document.addEventListener('DOMContentLoaded', () => {
    // Detect if we are running under Traefik subpath
    const BASE_PATH = window.location.pathname.includes('/mail-wa') ? '/mail-wa' : '';
    const socket = io({ path: BASE_PATH + '/socket.io' });
    
    // Elements
    const filtersContainer = document.getElementById('filters-container');
    const addFilterBtn = document.getElementById('add-filter-btn');
    const modal = document.getElementById('filter-modal');
    const filterForm = document.getElementById('filter-form');
    const cancelBtn = document.getElementById('cancel-btn');
    const logContainer = document.getElementById('log-container');
    
    const enableVoiceBtn = document.getElementById('enable-voice-btn');
    const voiceStatusText = document.getElementById('voice-status-text');
    const voiceSelect = document.getElementById('voice-select');
    const testVoiceBtn = document.getElementById('test-voice-btn');

    const enableSystemBtn = document.getElementById('enable-system-btn');
    const systemStatusText = document.getElementById('system-status-text');

    let isVoiceEnabled = false;
    let isSystemEnabled = false;
    const SYSTEM_STORAGE_KEY = 'mailpulse_system_notif';

    // --- VOICE PICKER (TTS) ---
    const VOICE_STORAGE_KEY = 'mailpulse_voice';
    let availableVoices = [];

    function populateVoices() {
        const ttsSupported = 'speechSynthesis' in window;
        availableVoices = ttsSupported ? window.speechSynthesis.getVoices() : [];

        if (!availableVoices.length) {
            voiceSelect.innerHTML = '<option value="">(Tidak ada suara terdeteksi)</option>';
            return;
        }

        // Sort Indonesian voices first, then alphabetically
        const sorted = [...availableVoices].sort((a, b) => {
            const aId = a.lang.toLowerCase().startsWith('id');
            const bId = b.lang.toLowerCase().startsWith('id');
            if (aId !== bId) return aId ? -1 : 1;
            return a.name.localeCompare(b.name);
        });

        const saved = localStorage.getItem(VOICE_STORAGE_KEY);
        voiceSelect.innerHTML = '';
        sorted.forEach((voice) => {
            const opt = document.createElement('option');
            opt.value = voice.name;
            opt.textContent = `${voice.name} (${voice.lang})`;
            voiceSelect.appendChild(opt);
        });

        // Restore saved choice, otherwise default to the first (Indonesian) voice
        if (saved && sorted.some(v => v.name === saved)) {
            voiceSelect.value = saved;
        } else {
            voiceSelect.value = sorted[0].name;
        }
    }

    populateVoices();
    if ('speechSynthesis' in window) {
        // Voices load asynchronously in most browsers
        window.speechSynthesis.onvoiceschanged = populateVoices;
    }

    voiceSelect.addEventListener('change', () => {
        localStorage.setItem(VOICE_STORAGE_KEY, voiceSelect.value);
    });

    // Speak text using the currently selected voice
    function speak(text) {
        if (!('speechSynthesis' in window)) return;
        const utterance = new SpeechSynthesisUtterance(text);
        const selected = availableVoices.find(v => v.name === voiceSelect.value);
        if (selected) {
            utterance.voice = selected;
            utterance.lang = selected.lang;
        } else {
            utterance.lang = 'id-ID';
        }
        window.speechSynthesis.speak(utterance);
    }

    testVoiceBtn.addEventListener('click', () => {
        window.speechSynthesis.cancel();
        speak('Halo, ini contoh suara notifikasi email masuk.');
    });

    // --- VOICE NOTIFICATIONS ---
    enableVoiceBtn.addEventListener('click', () => {
        isVoiceEnabled = !isVoiceEnabled;
        if (isVoiceEnabled) {
            enableVoiceBtn.textContent = 'Voice Enabled';
            enableVoiceBtn.classList.replace('primary-btn', 'outline-btn');
            enableVoiceBtn.style.color = 'var(--accent-color)';
            enableVoiceBtn.style.borderColor = 'var(--accent-color)';

            voiceStatusText.textContent = '🔊 Voice notifications active';
            voiceStatusText.className = 'status-text success';

            // Play a silent test to initialize SpeechSynthesis in user context
            const testUtterance = new SpeechSynthesisUtterance('');
            window.speechSynthesis.speak(testUtterance);
        } else {
            enableVoiceBtn.textContent = 'Enable Voice Notifications';
            enableVoiceBtn.classList.replace('outline-btn', 'primary-btn');
            enableVoiceBtn.style.color = '';
            enableVoiceBtn.style.borderColor = '';

            voiceStatusText.textContent = '⚠️ Voice Auto-play requires interaction';
            voiceStatusText.className = 'status-text warning';
        }
    });

    // --- SYSTEM (WINDOWS) NOTIFICATIONS ---
    function updateSystemUI() {
        if (isSystemEnabled && 'Notification' in window && Notification.permission === 'granted') {
            enableSystemBtn.textContent = 'System Notifications Enabled';
            enableSystemBtn.classList.replace('primary-btn', 'outline-btn');
            enableSystemBtn.style.color = 'var(--accent-color)';
            enableSystemBtn.style.borderColor = 'var(--accent-color)';

            systemStatusText.textContent = '🔔 Windows Notifications active';
            systemStatusText.className = 'status-text success';
        } else {
            enableSystemBtn.textContent = 'Enable Windows Notifications';
            enableSystemBtn.classList.replace('outline-btn', 'primary-btn');
            enableSystemBtn.style.color = '';
            enableSystemBtn.style.borderColor = '';

            if (!('Notification' in window)) {
                systemStatusText.textContent = '❌ Browser does not support Notifications';
                systemStatusText.className = 'status-text danger';
            } else if (Notification.permission === 'denied') {
                systemStatusText.textContent = '❌ Notifications blocked by browser';
                systemStatusText.className = 'status-text danger';
            } else {
                systemStatusText.textContent = '⚠️ Windows Notifications disabled';
                systemStatusText.className = 'status-text warning';
            }
        }
    }

    // Check saved settings on load
    const savedSystemSetting = localStorage.getItem(SYSTEM_STORAGE_KEY);
    if (savedSystemSetting === 'true' && 'Notification' in window && Notification.permission === 'granted') {
        isSystemEnabled = true;
    }
    updateSystemUI();

    enableSystemBtn.addEventListener('click', async () => {
        if (!('Notification' in window)) {
            alert('Browser Anda tidak mendukung notifikasi sistem.');
            return;
        }

        if (isSystemEnabled) {
            isSystemEnabled = false;
            localStorage.setItem(SYSTEM_STORAGE_KEY, 'false');
            updateSystemUI();
        } else {
            if (Notification.permission === 'granted') {
                isSystemEnabled = true;
                localStorage.setItem(SYSTEM_STORAGE_KEY, 'true');
                updateSystemUI();
                
                // Play a silent test to initialize SpeechSynthesis in user context
                const testUtterance = new SpeechSynthesisUtterance('');
                window.speechSynthesis.speak(testUtterance);

                new Notification('MailPulse', {
                    body: 'Notifikasi sistem telah diaktifkan!',
                    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📬</text></svg>'
                });
            } else if (Notification.permission !== 'denied') {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    isSystemEnabled = true;
                    localStorage.setItem(SYSTEM_STORAGE_KEY, 'true');
                    updateSystemUI();
                    
                    // Play a silent test to initialize SpeechSynthesis in user context
                    const testUtterance = new SpeechSynthesisUtterance('');
                    window.speechSynthesis.speak(testUtterance);

                    new Notification('MailPulse', {
                        body: 'Notifikasi sistem telah diaktifkan!',
                        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📬</text></svg>'
                    });
                } else {
                    updateSystemUI();
                }
            } else {
                alert('Izin notifikasi diblokir oleh browser. Silakan aktifkan izin notifikasi di pengaturan browser Anda.');
            }
        }
    });

    // --- INCOMING EMAIL LOGIC ---

    socket.on('new_email', (data) => {
        const { type, sender, subject } = data;
        
        // Log to UI
        addLogItem(type, sender, subject);

        let typeText = 'Email Baru';
        if (type === 'reply') typeText = 'Balasan Email';
        if (type === 'forward') typeText = 'Terusan Email';

        // Trigger Windows System Notification
        if (isSystemEnabled && 'Notification' in window && Notification.permission === 'granted') {
            const notif = new Notification(`MailPulse: ${typeText}`, {
                body: `Dari: ${sender}\nSubjek: ${subject || '(Tidak ada subjek)'}`,
                icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>📬</text></svg>',
                requireInteraction: false
            });
            notif.onclick = () => {
                window.focus();
            };
        }

        // Play voice
        if (isVoiceEnabled || isSystemEnabled) {
            let message = '';
            if (type === 'reply') {
                message = `Email balasan dari ${sender} dengan subjek ${subject}`;
            } else if (type === 'forward') {
                message = `Terusan email dari ${sender} dengan subjek ${subject}`;
            } else {
                message = `Email masuk dari ${sender} dengan subjek ${subject}`;
            }

            speak(message);
        }
    });

    function addLogItem(type, sender, subject) {
        // Remove empty message if exists
        const emptyMsg = logContainer.querySelector('.empty-log');
        if (emptyMsg) emptyMsg.remove();

        const logDiv = document.createElement('div');
        logDiv.className = `log-item ${type}`;
        
        const now = new Date().toLocaleTimeString('id-ID');
        let typeText = 'New Email';
        if (type === 'reply') typeText = 'Reply';
        if (type === 'forward') typeText = 'Forward';

        logDiv.innerHTML = `
            <div class="log-time">${now} • ${typeText}</div>
            <div class="log-title">${subject || '(No Subject)'}</div>
            <div class="log-sender">${sender}</div>
        `;
        
        logContainer.prepend(logDiv);
    }


    // --- BLACKLISTS CRUD ---
    async function fetchFilters() {
        try {
            const res = await fetch(BASE_PATH + '/api/blacklists');
            const filters = await res.json();
            renderFilters(filters);
        } catch (err) {
            console.error('Failed to fetch blacklists', err);
        }
    }

    function renderFilters(filters) {
        filtersContainer.innerHTML = '';
        if (filters.length === 0) {
            filtersContainer.innerHTML = '<p style="color:var(--text-secondary); grid-column:1/-1;">No blacklists configured. All emails will be forwarded.</p>';
            return;
        }

        filters.forEach(filter => {
            const card = document.createElement('div');
            card.className = `filter-card ${filter.is_active ? '' : 'inactive'}`;
            
            let typeText = "Keduanya";
            if (filter.email_type === "new") typeText = "Email Baru Saja";
            if (filter.email_type === "reply") typeText = "Balasan/Terusan Saja";

            card.innerHTML = `
                <div class="filter-header">
                    <h3>${filter.name}</h3>
                    <div class="filter-actions">
                        <button class="icon-btn edit" data-id="${filter.id}">✎</button>
                        <button class="icon-btn delete" data-id="${filter.id}">🗑</button>
                    </div>
                </div>
                <div class="filter-detail">
                    <div class="detail-label">Tipe Email</div>
                    <div class="detail-value">${typeText}</div>
                </div>
                <div class="filter-detail" style="margin-top:0.5rem">
                    <div class="detail-label">Email To</div>
                    <div class="detail-value">${filter.email_to || '-'}</div>
                </div>
                <div class="filter-detail" style="margin-top:0.5rem">
                    <div class="detail-label">CC</div>
                    <div class="detail-value">${filter.cc || '-'}</div>
                </div>
                <div class="filter-detail" style="margin-top:0.5rem">
                    <div class="detail-label">Nama Pengirim</div>
                    <div class="detail-value">${filter.sender_name || '-'}</div>
                </div>
                <div class="filter-detail" style="margin-top:0.5rem">
                    <div class="detail-label">Email Pengirim</div>
                    <div class="detail-value">${filter.sender_email || '-'}</div>
                </div>
                <div class="filter-detail" style="margin-top:0.5rem">
                    <div class="detail-label">Subject</div>
                    <div class="detail-value">${filter.subject || '-'}</div>
                </div>
                <div class="filter-detail" style="margin-top:0.5rem">
                    <div class="detail-label">Body</div>
                    <div class="detail-value">${filter.body || '-'}</div>
                </div>
            `;
            
            // Event listeners
            card.querySelector('.edit').addEventListener('click', () => openModal(filter));
            card.querySelector('.delete').addEventListener('click', () => deleteFilter(filter.id));

            filtersContainer.appendChild(card);
        });
    }

    async function deleteFilter(id) {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        try {
            await fetch(BASE_PATH + `/api/blacklists/${id}`, { method: 'DELETE' });
            fetchFilters();
        } catch (err) {
            console.error(err);
        }
    }

    // Modal Logic
    function openModal(filter = null) {
        modal.classList.add('active');
        document.getElementById('modal-title').textContent = filter ? 'Edit Rule' : 'Add New Rule';
        
        if (filter) {
            document.getElementById('filter-id').value = filter.id;
            document.getElementById('filter-name').value = filter.name;
            document.getElementById('filter-type').value = filter.email_type || 'both';
            document.getElementById('filter-to').value = filter.email_to || '';
            document.getElementById('filter-cc').value = filter.cc || '';
            document.getElementById('filter-sender-name').value = filter.sender_name || '';
            document.getElementById('filter-sender-email').value = filter.sender_email || '';
            document.getElementById('filter-subject').value = filter.subject || '';
            document.getElementById('filter-body').value = filter.body || '';
            document.getElementById('filter-active').checked = filter.is_active === 1;
        } else {
            filterForm.reset();
            document.getElementById('filter-id').value = '';
            document.getElementById('filter-active').checked = true;
            document.getElementById('filter-type').value = 'both';
        }
    }

    function closeModal() {
        modal.classList.remove('active');
    }

    addFilterBtn.addEventListener('click', () => openModal());
    cancelBtn.addEventListener('click', closeModal);

    filterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('filter-id').value;
        const payload = {
            name: document.getElementById('filter-name').value,
            email_type: document.getElementById('filter-type').value,
            email_to: document.getElementById('filter-to').value,
            cc: document.getElementById('filter-cc').value,
            sender_name: document.getElementById('filter-sender-name').value,
            sender_email: document.getElementById('filter-sender-email').value,
            subject: document.getElementById('filter-subject').value,
            body: document.getElementById('filter-body').value,
            is_active: document.getElementById('filter-active').checked ? 1 : 0
        };

        try {
            if (id) {
                // Update
                await fetch(BASE_PATH + `/api/blacklists/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create
                await fetch(BASE_PATH + '/api/blacklists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            closeModal();
            fetchFilters();
        } catch (err) {
            console.error('Error saving blacklist rule', err);
            alert('Failed to save blacklist rule');
        }
    });

    // Initial load
    fetchFilters();
});

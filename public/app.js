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

    let isVoiceEnabled = false;

    // --- VOICE NOTIFICATIONS ---
    enableVoiceBtn.addEventListener('click', () => {
        isVoiceEnabled = true;
        enableVoiceBtn.textContent = 'Voice Enabled';
        enableVoiceBtn.classList.replace('primary-btn', 'outline-btn');
        enableVoiceBtn.style.color = 'var(--accent-color)';
        enableVoiceBtn.style.borderColor = 'var(--accent-color)';
        
        voiceStatusText.textContent = '🔊 Voice notifications active';
        voiceStatusText.className = 'status-text success';

        // Play a silent test to initialize SpeechSynthesis in user context
        const testUtterance = new SpeechSynthesisUtterance('');
        window.speechSynthesis.speak(testUtterance);
    });

    // --- WHATSAPP QR CODE LOGIC ---
    const qrModal = document.getElementById('qr-modal');
    const qrImage = document.getElementById('qr-image');
    const qrLoading = document.getElementById('qr-loading');

    socket.on('wa_status', (data) => {
        if (!data.ready) {
            qrModal.classList.add('active');
        } else {
            qrModal.classList.remove('active');
        }
    });

    socket.on('wa_qr', (qr) => {
        qrModal.classList.add('active');
        qrLoading.style.display = 'none';
        qrImage.style.display = 'block';
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qr)}`;
    });

    socket.on('wa_ready', () => {
        qrModal.classList.remove('active');
        alert('WhatsApp Client Authenticated Successfully!');
    });

    socket.on('wa_disconnected', () => {
        qrModal.classList.add('active');
        qrLoading.style.display = 'block';
        qrImage.style.display = 'none';
        qrLoading.textContent = 'WhatsApp disconnected. Waiting for new QR...';
    });

    // --- INCOMING EMAIL LOGIC ---

    socket.on('new_email', (data) => {
        const { type, sender, subject } = data;
        
        // Log to UI
        addLogItem(type, sender, subject);

        // Play voice
        if (isVoiceEnabled && 'speechSynthesis' in window) {
            let message = '';
            if (type === 'reply') {
                message = `Email balasan dari ${sender} dengan subjek ${subject}`;
            } else if (type === 'forward') {
                message = `Terusan email dari ${sender} dengan subjek ${subject}`;
            } else {
                message = `Email masuk dari ${sender} dengan subjek ${subject}`;
            }

            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = 'id-ID'; // Indonesian voice
            window.speechSynthesis.speak(utterance);
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


    // --- FILTERS CRUD ---
    async function fetchFilters() {
        try {
            const res = await fetch(BASE_PATH + '/api/filters');
            const filters = await res.json();
            renderFilters(filters);
        } catch (err) {
            console.error('Failed to fetch filters', err);
        }
    }

    function renderFilters(filters) {
        filtersContainer.innerHTML = '';
        if (filters.length === 0) {
            filtersContainer.innerHTML = '<p style="color:var(--text-secondary); grid-column:1/-1;">No filters configured. All emails will be ignored.</p>';
            return;
        }

        filters.forEach(filter => {
            const card = document.createElement('div');
            card.className = `filter-card ${filter.is_active ? '' : 'inactive'}`;
            card.innerHTML = `
                <div class="filter-header">
                    <h3>${filter.name}</h3>
                    <div class="filter-actions">
                        <button class="icon-btn edit" data-id="${filter.id}">✎</button>
                        <button class="icon-btn delete" data-id="${filter.id}">🗑</button>
                    </div>
                </div>
                <div class="filter-detail">
                    <div class="detail-label">Sender Contains</div>
                    <div class="detail-value">${filter.sender_contains || '-'}</div>
                </div>
                <div class="filter-detail" style="margin-top:0.5rem">
                    <div class="detail-label">Subject Contains</div>
                    <div class="detail-value">${filter.subject_contains || '-'}</div>
                </div>
                <div class="filter-detail" style="margin-top:0.5rem">
                    <div class="detail-label">Body Contains</div>
                    <div class="detail-value">${filter.body_contains || '-'}</div>
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
            await fetch(BASE_PATH + `/api/filters/${id}`, { method: 'DELETE' });
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
            document.getElementById('filter-sender').value = filter.sender_contains || '';
            document.getElementById('filter-subject').value = filter.subject_contains || '';
            document.getElementById('filter-body').value = filter.body_contains || '';
            document.getElementById('filter-active').checked = filter.is_active === 1;
        } else {
            filterForm.reset();
            document.getElementById('filter-id').value = '';
            document.getElementById('filter-active').checked = true;
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
            sender_contains: document.getElementById('filter-sender').value,
            subject_contains: document.getElementById('filter-subject').value,
            body_contains: document.getElementById('filter-body').value,
            is_active: document.getElementById('filter-active').checked ? 1 : 0
        };

        try {
            if (id) {
                // Update
                await fetch(BASE_PATH + `/api/filters/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                // Create
                await fetch(BASE_PATH + '/api/filters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            closeModal();
            fetchFilters();
        } catch (err) {
            console.error('Error saving filter', err);
            alert('Failed to save filter');
        }
    });

    // Initial load
    fetchFilters();
});

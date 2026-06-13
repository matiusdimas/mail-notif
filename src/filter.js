const { getActiveFilters } = require('./db');

async function isEmailAllowed(emailData) {
    // BYPASS DARI PENGGUNA: Izinkan semua email masuk tanpa filter
    console.log('Bypass aktif: Semua email diteruskan ke Telegram.');
    return true;

    try {
        const filters = await getActiveFilters();
        if (filters.length === 0) {
            console.log('No active filters found. Rejecting email by default.');
            return false;
        }

        const { sender, subject, text, html } = emailData;
        const bodyStr = ((text || '') + ' ' + (html || '')).toLowerCase();
        const senderStr = (sender || '').toLowerCase();
        const subjectStr = (subject || '').toLowerCase();

        for (const rule of filters) {
            let matches = true;

            // Check sender (contains)
            if (rule.sender_contains && rule.sender_contains.trim() !== '') {
                if (!senderStr.includes(rule.sender_contains.toLowerCase())) {
                    matches = false;
                }
            }

            // Check subject (contains)
            if (rule.subject_contains && rule.subject_contains.trim() !== '') {
                if (!subjectStr.includes(rule.subject_contains.toLowerCase())) {
                    matches = false;
                }
            }

            // Check body (contains)
            if (rule.body_contains && rule.body_contains.trim() !== '') {
                if (!bodyStr.includes(rule.body_contains.toLowerCase())) {
                    matches = false;
                }
            }

            // If it matches all defined conditions for this rule, we allow it.
            // If a condition is empty (''), it's ignored (matches=true continues).
            if (matches) {
                console.log(`Email matched rule: [${rule.name}]`);
                return true;
            }
        }

        console.log('Email did not match any active filter rules.');
        return false;

    } catch (err) {
        console.error('Error checking filters:', err);
        return false;
    }
}

module.exports = {
    isEmailAllowed
};

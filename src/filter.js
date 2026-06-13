const { getActiveFilters } = require('./db');

async function isEmailAllowed(emailData) {
    try {
        const blacklists = await getActiveFilters();
        if (blacklists.length === 0) {
            console.log('No active blacklists found. Allowing email.');
            return true;
        }

        const { to, cc, senderName, sender, subject, text, html, email_type } = emailData;
        const bodyStr = ((text || '') + ' ' + (html || '')).toLowerCase();
        const senderEmailStr = (sender || '').toLowerCase();
        const senderNameStr = (senderName || '').toLowerCase();
        const subjectStr = (subject || '').toLowerCase();
        const toStr = (to || '').toLowerCase();
        const ccStr = (cc || '').toLowerCase();
        const typeStr = (email_type || 'new').toLowerCase();

        for (const rule of blacklists) {
            let matches = true;

            if (rule.email_type && rule.email_type !== 'both') {
                const isReplyOrForward = typeStr === 'reply' || typeStr === 'forward';
                if (rule.email_type === 'new' && isReplyOrForward) matches = false;
                if (rule.email_type === 'reply' && !isReplyOrForward) matches = false;
            }

            if (matches && rule.email_to && rule.email_to.trim() !== '') {
                if (!toStr.includes(rule.email_to.toLowerCase())) matches = false;
            }

            if (matches && rule.cc && rule.cc.trim() !== '') {
                if (!ccStr.includes(rule.cc.toLowerCase())) matches = false;
            }

            if (matches && rule.sender_name && rule.sender_name.trim() !== '') {
                if (!senderNameStr.includes(rule.sender_name.toLowerCase())) matches = false;
            }

            if (matches && rule.sender_email && rule.sender_email.trim() !== '') {
                if (!senderEmailStr.includes(rule.sender_email.toLowerCase())) matches = false;
            }

            if (matches && rule.subject && rule.subject.trim() !== '') {
                if (!subjectStr.includes(rule.subject.toLowerCase())) matches = false;
            }

            if (matches && rule.body && rule.body.trim() !== '') {
                if (!bodyStr.includes(rule.body.toLowerCase())) matches = false;
            }

            const hasConditions = (rule.email_to && rule.email_to.trim() !== '') ||
                                  (rule.cc && rule.cc.trim() !== '') ||
                                  (rule.sender_name && rule.sender_name.trim() !== '') ||
                                  (rule.sender_email && rule.sender_email.trim() !== '') ||
                                  (rule.subject && rule.subject.trim() !== '') ||
                                  (rule.body && rule.body.trim() !== '') ||
                                  (rule.email_type && rule.email_type !== 'both');

            if (matches && hasConditions) {
                console.log(`Email blocked by blacklist rule: [${rule.name}]`);
                return false;
            }
        }

        console.log('Email did not match any active blacklist rules. Allowing.');
        return true;

    } catch (err) {
        console.error('Error checking blacklists:', err);
        return true;
    }
}

module.exports = {
    isEmailAllowed
};

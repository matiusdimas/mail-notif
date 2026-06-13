
// Escape characters that are special in Telegram HTML parse mode.
function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatMessage(emailData) {
    const { sender, subject } = emailData;

    let emailType = '📩 <b>Email Baru</b>';
    const cleanSubject = (subject || '').trim();

    if (/^(re|balas):/i.test(cleanSubject)) {
        emailType = '↩️ <b>Balasan Email</b>';
    } else if (/^(fwd|fw|terusan):/i.test(cleanSubject)) {
        emailType = '➡️ <b>Terusan Email</b>';
    }

    const template = `${emailType}
👤 <b>Pengirim:</b> ${escapeHtml(sender) || 'Unknown'}
📌 <b>Subjek:</b> ${escapeHtml(cleanSubject) || '(No Subject)'}`;

    return template;
}

module.exports = {
    formatMessage
};

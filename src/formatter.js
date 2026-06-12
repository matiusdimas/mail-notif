
function formatMessage(emailData) {
    const { sender, subject } = emailData;

    let emailType = '📩 *Email Baru*';
    const cleanSubject = (subject || '').trim();

    if (/^(re|balas):/i.test(cleanSubject)) {
        emailType = '↩️ *Balasan Email*';
    } else if (/^(fwd|fw|terusan):/i.test(cleanSubject)) {
        emailType = '➡️ *Terusan Email*';
    }

    const template = `${emailType}
👤 *Pengirim:* ${sender || 'Unknown'}
📌 *Subjek:* ${cleanSubject || '(No Subject)'}`;

    return template;
}

module.exports = {
    formatMessage
};

require('dotenv').config();

const TELEGRAM_API = 'https://api.telegram.org';

const getConfig = () => ({
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID
});

// Sends a message to the configured Telegram chat.
// `message` may contain Telegram-supported HTML (see formatter.js).
const sendTelegramMessage = async (message) => {
    const { token, chatId } = getConfig();

    if (!token || !chatId) {
        console.error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is not set in .env');
        return false;
    }

    try {
        const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });

        const data = await res.json();
        if (!data.ok) {
            console.error('Telegram API error:', data.description);
            return false;
        }

        console.log('Message sent successfully to Telegram.');
        return true;
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
        return false;
    }
};

module.exports = {
    sendTelegramMessage
};

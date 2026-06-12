const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { EventEmitter } = require('events');
require('dotenv').config();

const waEvents = new EventEmitter();
require('dotenv').config();


const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
});

let isReady = false;
let latestQR = null;

client.on('loading_screen', (percent, message) => {
    console.log('WhatsApp Loading Screen:', percent, '%', message);
});

client.on('qr', (qr) => {
    console.log('QR Code received, scan please:');
    qrcode.generate(qr, { small: true });
    latestQR = qr;
    waEvents.emit('qr', qr);
});

client.on('ready', async () => {
    console.log('Client is ready!');
    isReady = true;
    latestQR = null;
    waEvents.emit('ready');
    try {
        const chats = await client.getChats();
        const groups = chats.filter(chat => chat.isGroup);
        console.log('\n--- DAFTAR GRUP WHATSAPP ANDA ---');
        groups.forEach(group => {
            console.log(`Nama: ${group.name} | ID: ${group.id._serialized}`);
        });
        console.log('---------------------------------\n');
    } catch (err) {
        console.error('Gagal mendapatkan daftar grup:', err);
    }
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
});

client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    isReady = false;
    latestQR = null;
    waEvents.emit('disconnected');
    // Auto-reconnect happens usually when running locally with LocalAuth or you can process restart
    // client.initialize();
});

const initializeWA = () => {
    console.log('Initializing WhatsApp Client...');
    client.initialize();
};

const sendWhatsAppMessage = async (message) => {
    if (!isReady) {
        console.warn('WhatsApp Client is not ready. Message will not be sent.');
        return false;
    }

    const targetWaNumber = process.env.TARGET_WA_NUMBER;

    if (!targetWaNumber) {
        console.error('TARGET_WA_NUMBER is not set in .env');
        return false;
    }

    try {
        await client.sendMessage(targetWaNumber, message);
        console.log('Message sent successfully to WhatsApp.');
        return true;
    } catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        return false;
    }
};

const getWaStatus = () => {
    return isReady;
};

const getLatestQR = () => {
    return latestQR;
};

module.exports = {
    initializeWA,
    sendWhatsAppMessage,
    waEvents,
    getWaStatus,
    getLatestQR
};

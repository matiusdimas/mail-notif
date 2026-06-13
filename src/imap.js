const imaps = require('imap-simple');
const simpleParser = require('mailparser').simpleParser;
require('dotenv').config();

const config = {
    imap: {
        user: process.env.GMAIL_USER,
        password: process.env.GMAIL_APP_PASSWORD,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 30000,
        tlsOptions: { rejectUnauthorized: false },
        debug: (str) => {
            console.log('[IMAP RAW]', str.trim());
        }
    }
};

let imapConnection = null;
let onEmailReceivedCallback = null;

const setupImapListener = async (callback) => {
    onEmailReceivedCallback = callback;
    
    if (!config.imap.user || !config.imap.password) {
        console.error('Gmail credentials are not set in .env');
        return;
    }

    try {
        console.log('Connecting to IMAP Server...');
        imapConnection = await imaps.connect(config);
        console.log('IMAP Connected successfully.');

        await imapConnection.openBox('INBOX');
        console.log('Watching INBOX for new emails...');

        imapConnection.on('mail', (numNewMsgs) => {
            console.log(`${numNewMsgs} new email(s) detected. Waiting 1s before processing...`);
            setTimeout(() => {
                fetchNewEmails();
            }, 1000);
        });

        imapConnection.on('error', (err) => {
            console.error('IMAP Error:', err);
        });

        imapConnection.on('end', () => {
            console.log('IMAP Connection ended. Reconnecting...');
            setTimeout(() => setupImapListener(onEmailReceivedCallback), 5000);
        });

    } catch (err) {
        console.error('Failed to connect to IMAP:', err);
        console.log('Retrying in 10 seconds...');
        setTimeout(() => setupImapListener(onEmailReceivedCallback), 10000);
    }
};

const fetchNewEmails = async () => {
    if (!imapConnection) return;
    
    const fetchOptions = {
        bodies: [''],
        markSeen: true
    };

    try {
        console.log('Searching for UNSEEN messages...');
        
        // Dapatkan daftar UID email UNSEEN terlebih dahulu
        const uids = await new Promise((resolve, reject) => {
            imapConnection.imap.search(['UNSEEN'], (err, results) => {
                if (err) reject(err);
                else resolve(results || []);
            });
        });

        console.log(`Search completed. Found ${uids.length} unseen message(s) in total.`);
        
        if (uids.length === 0) {
            console.log('No unseen messages found.');
            return;
        }

        // Batasi hanya mengambil 1 email TERBARU yang belum dibaca
        const maxFetch = 1;
        const latestUids = uids.slice(-maxFetch);
        console.log(`Fetching details for the latest ${latestUids.length} unseen message(s)...`);

        const messages = await imapConnection.search([['UID', latestUids]], fetchOptions);
        console.log(`Successfully fetched ${messages.length} message(s).`);

        for (const msg of messages) {
            const allBody = msg.parts.find(part => part.which === '');
            const id = msg.attributes.uid;
            const idHeader = "Imap-Id: "+id+"\r\n";

            simpleParser(idHeader + allBody.body, async (err, parsed) => {
                if (err) {
                    console.error('Error parsing email:', err);
                    return;
                }

                const emailData = {
                    sender: parsed.from?.text,
                    senderName: parsed.from?.value?.[0]?.name || '',
                    senderEmail: parsed.from?.value?.[0]?.address || '',
                    to: parsed.to?.text || '',
                    cc: parsed.cc?.text || '',
                    subject: parsed.subject,
                    date: parsed.date,
                    text: parsed.text,
                    html: parsed.html
                };

                if (onEmailReceivedCallback) {
                    onEmailReceivedCallback(emailData);
                }
            });
        }
    } catch (err) {
        console.error('Error fetching new emails:', err);
    }
};

module.exports = {
    setupImapListener
};

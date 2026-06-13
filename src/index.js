require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { sendTelegramMessage } = require('./telegram');
const { setupImapListener } = require('./imap');
const { isEmailAllowed } = require('./filter');
const { formatMessage } = require('./formatter');
const db = require('./db'); // Requires db to initialize and access functions

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// REST API Routes
app.get('/api/filters', async (req, res) => {
    try {
        const filters = await db.getAllFilters();
        res.json(filters);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/filters', async (req, res) => {
    try {
        const id = await db.addFilter(req.body);
        res.json({ id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/filters/:id', async (req, res) => {
    try {
        const changes = await db.updateFilter(req.params.id, req.body);
        res.json({ changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/filters/:id', async (req, res) => {
    try {
        const changes = await db.deleteFilter(req.params.id);
        res.json({ changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

async function processIncomingEmail(emailData) {
    console.log(`\n--- New Email Received ---`);
    console.log(`From: ${emailData.sender}`);
    console.log(`Subject: ${emailData.subject}`);

    // Determine if it's a reply or new
    let type = 'new';
    const cleanSubject = (emailData.subject || '').trim();
    if (/^(re|balas):/i.test(cleanSubject)) {
        type = 'reply';
    } else if (/^(fwd|fw|terusan):/i.test(cleanSubject)) {
        type = 'forward';
    }

    // Emit event to connected clients for voice notification
    io.emit('new_email', {
        type: type,
        sender: emailData.sender || 'Unknown',
        subject: cleanSubject
    });

    const allowed = await isEmailAllowed(emailData);

    if (allowed) {
        console.log('Email passed the filters. Formatting and forwarding to Telegram...');
        const message = formatMessage(emailData);

        const success = await sendTelegramMessage(message);
        if (success) {
            console.log('Successfully forwarded to Telegram.');
        } else {
            console.log('Failed to forward to Telegram.');
        }
    } else {
        console.log('Email ignored by filters.');
    }
}

async function startApp() {
    console.log('Starting MailPulse...');

    // Start Web Server
    const WEB_PORT = process.env.WEB_PORT || process.env.PORT || 3000;
    server.listen(WEB_PORT, () => {
        console.log(`Web UI is running on http://localhost:${WEB_PORT}`);
    });

    // Start the Gmail IMAP listener
    setupImapListener(processIncomingEmail);
}

startApp();

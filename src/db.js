const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        db.run(`DROP TABLE IF EXISTS filters`, (err) => {
            if (err) console.error('Error dropping filters table', err.message);
        });

        db.run(`CREATE TABLE IF NOT EXISTS blacklists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email_to TEXT,
            cc TEXT,
            sender_name TEXT,
            sender_email TEXT,
            subject TEXT,
            body TEXT,
            email_type TEXT DEFAULT 'both',
            is_active INTEGER DEFAULT 1
        )`, (err) => {
            if (err) {
                console.error('Error creating blacklists table', err.message);
            } else {
                seedData();
            }
        });
    });
}

function seedData() {
    db.get('SELECT COUNT(*) as count FROM blacklists', (err, row) => {
        if (err) {
            console.error('Error checking blacklists count', err.message);
            return;
        }

        if (row.count === 0) {
            const stmt = db.prepare(`INSERT INTO blacklists (name, email_to, cc, sender_name, sender_email, subject, body, email_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
            
            // Seed 1: Spam rule
            stmt.run('Spam Emails', '', '', '', 'spam@spam.com', '', '', 'both', 1);

            stmt.finalize();
            console.log('Seeded initial blacklist rules.');
        }
    });
}

function getActiveFilters() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM blacklists WHERE is_active = 1', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function getAllFilters() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM blacklists ORDER BY id DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function addFilter(filter) {
    return new Promise((resolve, reject) => {
        const { name, email_to, cc, sender_name, sender_email, subject, body, email_type, is_active } = filter;
        const stmt = db.prepare(`INSERT INTO blacklists (name, email_to, cc, sender_name, sender_email, subject, body, email_type, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
        stmt.run(name, email_to, cc, sender_name, sender_email, subject, body, email_type || 'both', is_active === undefined ? 1 : is_active, function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
        stmt.finalize();
    });
}

function updateFilter(id, filter) {
    return new Promise((resolve, reject) => {
        const { name, email_to, cc, sender_name, sender_email, subject, body, email_type, is_active } = filter;
        const stmt = db.prepare(`UPDATE blacklists SET name = ?, email_to = ?, cc = ?, sender_name = ?, sender_email = ?, subject = ?, body = ?, email_type = ?, is_active = ? WHERE id = ?`);
        stmt.run(name, email_to, cc, sender_name, sender_email, subject, body, email_type || 'both', is_active, id, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
        stmt.finalize();
    });
}

function deleteFilter(id) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`DELETE FROM blacklists WHERE id = ?`);
        stmt.run(id, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
        stmt.finalize();
    });
}

module.exports = {
    getActiveFilters,
    getAllFilters,
    addFilter,
    updateFilter,
    deleteFilter
};

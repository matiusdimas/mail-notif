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
        db.run(`CREATE TABLE IF NOT EXISTS filters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            sender_contains TEXT,
            subject_contains TEXT,
            body_contains TEXT,
            is_active INTEGER DEFAULT 1
        )`, (err) => {
            if (err) {
                console.error('Error creating filters table', err.message);
            } else {
                seedData();
            }
        });
    });
}

function seedData() {
    db.get('SELECT COUNT(*) as count FROM filters', (err, row) => {
        if (err) {
            console.error('Error checking filters count', err.message);
            return;
        }

        if (row.count === 0) {
            const stmt = db.prepare(`INSERT INTO filters (name, sender_contains, subject_contains, body_contains, is_active) VALUES (?, ?, ?, ?, ?)`);
            
            // Seed 1: URGENT emails
            stmt.run('URGENT Notifications', '', 'URGENT', '', 1);
            
            // Seed 2: Boss's emails
            stmt.run('Boss Emails', 'boss@company.com', '', '', 1);
            
            // Seed 3: Error alerts
            stmt.run('System Errors', 'noreply@', 'Error', '', 1);

            stmt.finalize();
            console.log('Seeded initial filter rules.');
        }
    });
}

function getActiveFilters() {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM filters WHERE is_active = 1', (err, rows) => {
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
        db.all('SELECT * FROM filters ORDER BY id DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function addFilter(filter) {
    return new Promise((resolve, reject) => {
        const { name, sender_contains, subject_contains, body_contains, is_active } = filter;
        const stmt = db.prepare(`INSERT INTO filters (name, sender_contains, subject_contains, body_contains, is_active) VALUES (?, ?, ?, ?, ?)`);
        stmt.run(name, sender_contains, subject_contains, body_contains, is_active === undefined ? 1 : is_active, function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
        stmt.finalize();
    });
}

function updateFilter(id, filter) {
    return new Promise((resolve, reject) => {
        const { name, sender_contains, subject_contains, body_contains, is_active } = filter;
        const stmt = db.prepare(`UPDATE filters SET name = ?, sender_contains = ?, subject_contains = ?, body_contains = ?, is_active = ? WHERE id = ?`);
        stmt.run(name, sender_contains, subject_contains, body_contains, is_active, id, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
        stmt.finalize();
    });
}

function deleteFilter(id) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare(`DELETE FROM filters WHERE id = ?`);
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

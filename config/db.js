// This line tells Node.js to bypass all self-signed certificate blocking
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Immediate connection test
pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ CONNECTION ERROR:', err.message);
    }
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY');
    release();
});

module.exports = pool;
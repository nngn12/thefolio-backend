// backend/seedAdmin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const seedAdmin = async () => {
    try {
        const name = 'Admin';
        const email = 'admin@thefolio.com';
        const password = 'admin123';
        const role = 'admin';

        // hash the password
        const hashed = await bcrypt.hash(password, 12);

        // insert admin into the database
        const result = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, email, hashed, role]
        );

        console.log('Admin created:', result.rows[0]);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedAdmin();
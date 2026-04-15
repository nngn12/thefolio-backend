// backend/seedAdmin.js
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// This tells the script to use the URL from your .env file
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seed() {
    try {
        console.log("--- Starting Seed Process ---");

        // 2. Check Connection
        console.log("Checking database connection...");
        const exists = await pool.query("SELECT id FROM users WHERE email=$1", ['admin@thefolio.com']);

        // 3. Check if already exists
        if (exists.rows.length > 0) {
            console.log('NOTICE: Admin user "admin@thefolio.com" already exists.');
            await pool.end();
            process.exit(0);
        }

        // 4. Hash and Insert
        console.log("Hashing password...");
        const hashed = await bcrypt.hash('Admin@1234', 12);

        console.log("Inserting admin user...");
        await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4)',
            ['TheFolio Admin', 'admin@thefolio.com', hashed, 'admin']
        );

        console.log('SUCCESS: Admin created!');
        await pool.end();
        process.exit(0);

    } catch (err) {
        console.error("--- SEED ERROR ---");
        console.error(err.message);

        // Try to close pool if it exists
        if (pool) await pool.end().catch(() => { });
        process.exit(1);
    }
}

// 5. Start the function
seed();
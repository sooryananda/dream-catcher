import pool from './database.js';

export async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS dreams (
                id SERIAL PRIMARY KEY,
                dream_text TEXT NOT NULL,
                interpretation TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('PostgreSQL database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
}
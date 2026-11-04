
import sqlite3 from 'sqlite3';
import pool from './config/database.js';

const sqlite = new sqlite3.Database('./dreams.db');

function getOldDreams() {
    return new Promise((resolve, reject) => {
        sqlite.all('SELECT * FROM dreams', [], (error, rows) => {
            if (error) reject(error);
            else resolve(rows);
        });
    });
}

async function migrateDreams() {
    try {
        const oldDreams = await getOldDreams();

        console.log(`Found ${oldDreams.length} old dreams.`);

        for (const dream of oldDreams) {
            await pool.query(
                `INSERT INTO dreams
                 (id, dream_text, interpretation, created_at)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    dream.id,
                    dream.dream_text,
                    dream.interpretation,
                    dream.created_at
                ]
            );

            console.log(`Processed dream ID: ${dream.id}`);
        }

        await pool.query(`
            SELECT setval(
                pg_get_serial_sequence('dreams', 'id'),
                COALESCE((SELECT MAX(id) FROM dreams), 1),
                EXISTS(SELECT 1 FROM dreams)
            )
        `);

        console.log('Old dreams migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        sqlite.close();
        await pool.end();
    }
}

migrateDreams();

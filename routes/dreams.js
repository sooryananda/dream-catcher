import express from 'express';
import pool from '../config/database.js';
import { getDreamInterpretation } from '../utils/ai-gemini.js';
import { validateText } from '../utils/validateText.js';

const router = express.Router();

// Get all dreams
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM dreams ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dreams' });
    }
});

// Get a single dream
router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM dreams WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dream not found' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch dream' });
    }
});

// Create a dream
router.post('/', async (req, res) => {
    const { dream_text } = req.body;

    const validation = validateText(dream_text);

    if (!validation.valid) {
        return res.status(400).json({
            error: validation.error,
            type: 'validation'
        });
    }

    try {
        let interpretation;

        try {
            interpretation = await getDreamInterpretation(validation.value);
        } catch (aiError) {
            console.error('AI interpretation failed:', aiError);
            return res.status(503).json({
                error: 'AI service temporarily unavailable.',
                type: 'ai_error'
            });
        }

        const result = await pool.query(
            `INSERT INTO dreams (dream_text, interpretation)
             VALUES ($1, $2)
             RETURNING *`,
            [validation.value, interpretation]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Error creating dream:', error);
        res.status(500).json({
            error: 'Failed to save dream.',
            type: 'database_error'
        });
    }
});

// Delete a dream
router.delete('/:id', async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM dreams WHERE id = $1 RETURNING id',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Dream not found' });
        }

        res.json({ message: 'Dream deleted successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete dream' });
    }
});

export default router;
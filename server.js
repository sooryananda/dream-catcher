import 'dotenv/config';
console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);
console.log("Gemini model:", process.env.GEMINI_MODEL);
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet'
import pool from './config/database.js';
import { initDatabase } from './config/database-init.js';
import dreamsRouter from './routes/dreams.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();


if (process.env.NODE_ENV === 'production') {
  app.use(helmet());
}
// Needed for security headers! Do not delete!
// app.use(helmet());

const PORT = process.env.PORT || 3001;
 
// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Application and Database Health Check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.status(200).json({
      status: 'UP',
      application: 'Dream Catcher',
      database: 'CONNECTED',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check failed:', error.message);

    res.status(503).json({
      status: 'DOWN',
      application: 'Dream Catcher',
      database: 'DISCONNECTED',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  }
});

// Process exit code demonstration endpoint
app.get('/test-process', (req, res) => {
  const code = Number(req.query.code);

  if (code !== 0 && code !== 1) {
    return res.status(400).json({
      error: 'Use ?code=0 or ?code=1'
    });
  }

  res.json({
    message: 'Process exit test initiated',
    exitCode: code
  });

  setTimeout(() => {
    process.exitCode = code;
    process.kill(process.pid, 'SIGTERM');
  }, 500);
});

app.get('/shutdown', (req, res) => {
  console.log('=== MANUAL SHUTDOWN TRIGGERED ===');
  res.send('Shutting down...');
  
  setTimeout(() => {
    process.kill(process.pid, 'SIGTERM');
  }, 100);
});



// API Routes
app.use('/api/dreams', dreamsRouter);


let server
let isShuttingDown = false;

// Initialize database then start server
try {
  await initDatabase();

  server =app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}





async function gracefulShutdown(signal) {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);

  if (server) {
    server.close(async (error) => {
      if (error) {
        console.error('HTTP server shutdown failed:', error);
        process.exitCode = 1;
      } else {
        console.log('HTTP server closed');
      }

      try {
        await pool.end();
        console.log('Database pool closed');
      } catch (dbError) {
        console.error('Database pool shutdown failed:', dbError);
        process.exitCode = 1;
      }
    });
  } else {
    try {
      await pool.end();
      console.log('Database pool closed');
    } catch (error) {
      console.error('Database pool shutdown failed:', error);
      process.exitCode = 1;
    }
  }
}

// Handle termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle process exit
process.on('exit', (code) => {
  console.log(`Node.js process is exiting with code: ${code}`);
});

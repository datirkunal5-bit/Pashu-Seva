import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import defaultDb from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createAdminRouter } from './routes/adminRoutes.js';
import { createMemberRouter } from './routes/memberRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Seed default data if needed
seedDatabase(defaultDb).catch((err) => {
  if (err.message && (err.message.includes('401') || err.message.includes('UNAUTHORIZED') || (err.cause && err.cause.status === 401))) {
    console.error('\n❌ DATABASE AUTHENTICATION ERROR (HTTP 401 Unauthorized):');
    console.error('The TURSO_AUTH_TOKEN in your Render environment variables is invalid, missing, or expired.');
    console.error('Please generate a fresh token on Turso and update TURSO_AUTH_TOKEN in Render.\n');
  } else {
    console.error('❌ Database initialization error:', err);
  }
});

// API Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Pashu Khadya Ledger API',
    society: 'सहकारी दूध व्यावसायिक संस्था मर्यादित',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', createAuthRouter(defaultDb));
app.use('/api/admin', createAdminRouter(defaultDb));
app.use('/api/member', createMemberRouter(defaultDb));

// Serve Frontend Static files
const frontendDir = path.resolve(__dirname, '../../frontend');
app.use(express.static(frontendDir));

// Fallback to index.html for Single-Page App
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

export function startServer(port = PORT) {
  return app.listen(port, () => {
    console.log(`🚀 Pashu Khadya Ledger Server running on http://localhost:${port}`);
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  startServer();
}

export default app;

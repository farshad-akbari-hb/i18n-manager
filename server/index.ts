import express from 'express';
import cors from 'cors';
import { loadConfig } from './config.js';
import translationsRouter from './routes/translations.js';
import jobsRouter from './routes/jobs.js';
import gitRouter from './routes/git.js';
import { historyManager } from './services/history-manager.js';

// Load config before anything else
loadConfig();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/translations', translationsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/git', gitRouter);

// Sections endpoint (needs to be separate because of route ordering)
app.get('/api/sections', async (req, res) => {
  try {
    const { loadTranslations, buildSectionTree } = await import(
      './services/translation-service.js'
    );
    // Accept languages from query param, default to de,fa
    const langParam = req.query.lang as string | undefined;
    const languages = langParam
      ? langParam.split(',')
      : ['de', 'fa'];
    const allTranslations = await loadTranslations(languages);
    const sections = buildSectionTree(allTranslations, languages);
    res.json({ sections });
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  console.log(`\n⏳ Received ${signal}, shutting down gracefully...`);

  // Flush any pending history changes
  await historyManager.shutdown();

  console.log('👋 Goodbye!\n');
  process.exit(0);
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server
app.listen(PORT, () => {
  console.log(`\n🌐 i18n Manager API running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
  console.log(`   Translations: http://localhost:${PORT}/api/translations`);
  console.log(`   Sections: http://localhost:${PORT}/api/sections`);
  console.log(`   Jobs: http://localhost:${PORT}/api/jobs`);
  console.log(`   Git: http://localhost:${PORT}/api/git\n`);
});

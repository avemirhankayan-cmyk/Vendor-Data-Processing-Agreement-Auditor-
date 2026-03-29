import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';

const db = new Database('enterprise_vault.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS audits_v2 (
    id TEXT PRIMARY KEY,
    date TEXT,
    vendor TEXT,
    category TEXT,
    evidence TEXT,
    is_compliant INTEGER,
    ai_analysis TEXT,
    verdict TEXT,
    notes TEXT
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.get('/api/audits', (req, res) => {
    try {
      const stmt = db.prepare('SELECT * FROM audits_v2 ORDER BY date DESC');
      const audits = stmt.all();
      res.json(audits);
    } catch (error) {
      console.error('Error fetching audits:', error);
      res.status(500).json({ error: 'Failed to fetch audits' });
    }
  });

  app.post('/api/audits', (req, res) => {
    try {
      const { audits } = req.body;
      const stmt = db.prepare('INSERT INTO audits_v2 (id, date, vendor, category, evidence, is_compliant, ai_analysis, verdict, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      
      const insertMany = db.transaction((audits) => {
        for (const audit of audits) {
          stmt.run(audit.id, audit.date, audit.vendor, audit.category, audit.evidence, audit.is_compliant, audit.ai_analysis, audit.verdict, audit.notes);
        }
      });

      insertMany(audits);
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error saving audits:', error);
      res.status(500).json({ error: error.message || 'Failed to save audits' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

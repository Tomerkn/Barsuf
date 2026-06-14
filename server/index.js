import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';
import db from './db.js';
import { reseedDatabase } from './seed.js';
import { ingestDocument, askQuestion, analyzeReceipt, analyzeTender, generateProposal, vectorStore, VECTOR_DB_PATH } from './ai.js';
import { uploadFileToCloud, ensureFileExistsLocally } from './storage.js';

const app = express();
const PORT = process.env.PORT || 3001;
const root = process.cwd();

// שימוש ב-/tmp לכתיבה בענן (Cloud Run)
const UPLOADS_DIR = '/tmp/barsuf_data/uploads';
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    try {
      // אם שם הקובץ כבר מכיל עברית תקינה (פוענח בהצלחה על ידי הדפדפן/השרת), לא נוגעים בו!
      const hasHebrew = /[\u0590-\u05FF]/.test(file.originalname);
      if (!hasHebrew) {
        // במידה ולא זוהתה עברית, ייתכן ומדובר בקידוד משובש (Mojibake). ננסה לפענח מ-latin1 ל-utf8.
        const decoded = Buffer.from(file.originalname, 'latin1').toString('utf8');
        // נעדכן את שם הקובץ רק אם הפיענוח אכן הניב תווים בעברית
        if (/[\u0590-\u05FF]/.test(decoded)) {
          file.originalname = decoded;
        }
      }
    } catch (e) {
      console.error('שגיאה בפענוח שם הקובץ מעברית:', e.message);
    }
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// מידלוור גיבוי לענן אוטומטי לאחר כל שינוי בבסיס הנתונים (POST, PUT, DELETE)
// המידלוור ממתין לסיום הגיבוי לפני שליחת התגובה למניעת מרוץ תהליכים (Race Condition) בשרת
app.use('/api', async (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method) && req.path !== '/reseed') {
    const originalJson = res.json;
    res.json = async function (body) {
      console.log(`☁️ Database modified via ${req.method} ${req.path}. Backing up to GCS...`);
      try {
        await db.backupToCloud();
        console.log('☁️ Database backup completed successfully.');
      } catch (e) {
        console.error('☁️ GCS backup failed:', e.message);
      }
      return originalJson.call(this, body);
    };

    const originalSend = res.send;
    res.send = async function (body) {
      console.log(`☁️ Database modified via ${req.method} ${req.path}. Backing up to GCS...`);
      try {
        await db.backupToCloud();
        console.log('☁️ Database backup completed successfully.');
      } catch (e) {
        console.error('☁️ GCS backup failed:', e.message);
      }
      return originalSend.call(this, body);
    };
  }
  next();
});

// הגשת קבצי האתר (Frontend)
const distPath = path.join(root, 'dist');
app.use(express.static(distPath));
// הגשת הקבצים שהועלו כקבצים סטטיים עם הורדה על פי דרישה מהענן
app.use('/uploads/:filename', async (req, res, next) => {
  const localPath = path.join(UPLOADS_DIR, req.params.filename);
  await ensureFileExistsLocally(localPath);
  next();
});
app.use('/uploads', express.static(UPLOADS_DIR));

// API
app.get('/api/health', (req, res) => res.json({ status: 'ok', root }));

app.post('/api/reseed', async (req, res) => {
  console.log('🔄 Manual reseed request received');
  try {
    await reseedDatabase(true);
    res.json({ success: true, message: 'Database successfully reseeded with rich presentation data!' });
  } catch (error) {
    console.error('❌ Reseed failed:', error);
    res.status(500).json({ error: 'Failed to reseed database', details: error.message });
  }
});

app.get('/api/projects', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects').all();
  res.json(projects);
});

app.get('/api/projects/:id', (req, res) => {
  const pid = Number(req.params.id);
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
  res.json(project);
});

app.post('/api/projects', (req, res) => {
  const { name, location, end_date, status } = req.body;
  const insert = db.prepare('INSERT INTO projects (name, location, end_date, status) VALUES (?, ?, ?, ?)');
  const info = insert.run(name, location, end_date, status || 'תקין');
  res.status(201).json({ id: info.lastInsertRowid });
});

app.put('/api/projects/:id', (req, res) => {
  const pid = Number(req.params.id);
  const { name, location, end_date, status } = req.body;
  db.prepare('UPDATE projects SET name = ?, location = ?, end_date = ?, status = ? WHERE id = ?')
    .run(name, location, end_date, status, pid);
  res.json({ success: true });
});

app.delete('/api/projects/:id', (req, res) => {
  const pid = Number(req.params.id);
  db.prepare('DELETE FROM projects WHERE id = ?').run(pid);
  db.prepare('DELETE FROM budgets WHERE project_id = ?').run(pid);
  db.prepare('DELETE FROM expenses WHERE project_id = ?').run(pid);
  res.json({ success: true });
});

app.get('/api/projects/:id/analytics', (req, res) => {
  const pid = Number(req.params.id);
  console.log(`🔍 Fetching analytics for project ID: ${pid}`);
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(pid);
    if (!project) {
      console.error(`❌ Project ${pid} not found in DB`);
      return res.status(404).json({ error: 'Project not found' });
    }

    const stats = db.prepare(`
      SELECT 
        (SELECT IFNULL(SUM(total_amount), 0) FROM budgets WHERE project_id = ?) as totalBudget,
        (SELECT IFNULL(SUM(amount), 0) FROM expenses WHERE project_id = ?) as actualExecution,
        (SELECT IFNULL(SUM(amount), 0) FROM incomes WHERE project_id = ?) as totalIncomes
    `).get(pid, pid, pid);
    
    // שאר הקוד נשאר זהה...

    const breakdown = db.prepare(`
      SELECT 
        b.id, b.category, b.total_amount as budget,
        IFNULL((SELECT SUM(amount) FROM expenses WHERE budget_id = b.id), 0) as actual
      FROM budgets b
      WHERE b.project_id = ?
    `).all(pid);

    const profitLoss = stats.totalIncomes - stats.actualExecution;
    const utilization = stats.totalBudget > 0 ? (stats.actualExecution / stats.totalBudget) * 100 : 0;

    res.json({
      project,
      ...stats,
      breakdown,
      profitLoss,
      utilization,
      variance: stats.actualExecution - stats.totalBudget
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch project analytics' });
  }
});

// ===== Project Media / Files API =====
app.get('/api/projects/:id/media', (req, res) => {
  const files = db.prepare('SELECT * FROM files WHERE project_id = ? ORDER BY upload_date DESC').all(req.params.id);
  // מוסיפים URL לכל קובץ כדי שהפרונט יוכל להציג אותו
  const filesWithUrl = files.map(f => ({
    ...f,
    url: `/uploads/${f.filename}`
  }));
  res.json(filesWithUrl);
});

app.post('/api/projects/:id/files', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    // העלאת הקובץ לגיבוי בענן על מנת שלא יאבד במעבר בין שרתים
    await uploadFileToCloud(req.file.path, req.file.filename).catch(e => 
      console.error(`☁️ GCS upload failed for project file:`, e)
    );

    const stmt = db.prepare('INSERT INTO files (project_id, filename, original_name, upload_date) VALUES (?, ?, ?, ?)');
    const result = stmt.run(req.params.id, req.file.filename, req.file.originalname, new Date().toISOString());
    res.json({ id: result.lastInsertRowid, url: `/uploads/${req.file.filename}`, filename: req.file.filename, original_name: req.file.originalname });
  } catch (err) {
    console.error('Database error during file upload:', err);
    res.status(500).json({ error: 'Failed to save file entry', details: err.message });
  }
});

app.get('/api/tenders', (req, res) => {
  const tenders = db.prepare(`
    SELECT t.*, p.id as project_id 
    FROM tenders t 
    LEFT JOIN projects p ON p.tender_id = t.id 
    ORDER BY t.upload_date DESC
  `).all();
  res.json(tenders);
});

app.get('/api/tenders/:id', (req, res) => {
  const tender = db.prepare(`
    SELECT t.*, p.id as project_id 
    FROM tenders t 
    LEFT JOIN projects p ON p.tender_id = t.id 
    WHERE t.id = ?
  `).get(req.params.id);
  if (!tender) return res.status(404).json({ error: 'Tender not found' });
  res.json(tender);
});

app.post('/api/tenders', upload.single('file'), async (req, res) => {
  console.log('📥 Received tender upload:', req.file?.originalname);
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  try {
    const insert = db.prepare('INSERT INTO tenders (name, filename, upload_date, status) VALUES (?, ?, ?, ?)');
    const info = insert.run(req.file.originalname, req.file.filename, new Date().toISOString(), 'מעלה...');
    const tenderId = info.lastInsertRowid;
    
    // העלאת קובץ המכרז המקורי לגיבוי בענן מייד עם קבלתו
    await uploadFileToCloud(req.file.path, req.file.filename).catch(e => 
      console.error(`☁️ GCS upload failed for tender PDF:`, e)
    );

    res.status(201).json({ id: tenderId });
  } catch (err) {
    console.error('Database error during tender upload:', err);
    res.status(500).json({ error: 'Failed to create tender entry', details: err.message });
  }
});

app.post('/api/tenders/:id/analyze', async (req, res) => {
  const tenderId = Number(req.params.id);
  console.log(`🤖 Starting analysis request synchronously for tender-${tenderId}...`);
  try {
    const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(tenderId);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });

    const filePath = path.join(UPLOADS_DIR, tender.filename);
    
    // מוודאים שהקובץ קיים מקומית (אם השרת אותחל או הועבר)
    await ensureFileExistsLocally(filePath).catch(e => 
      console.error(`Failed to ensure file exists locally for analysis:`, e.message)
    );

    // ביצוע אינדוקס RAG באופן סינכרוני
    console.log(`🤖 Starting RAG ingestion synchronously for tender-${tenderId}...`);
    await ingestDocument(`tender-${tenderId}`, filePath).catch(e => 
      console.error(`RAG ingestion failed for tender-${tenderId}:`, e)
    );

    const onPhaseOneComplete = (quickAnalysis) => {
      db.prepare('UPDATE tenders SET analysis = ?, status = ? WHERE id = ?')
        .run(quickAnalysis, 'נותח (ראשוני)', tenderId);
      console.log(`⚡ Phase 1 quick analysis saved for tender ${tenderId}`);
    };

    console.log(`🤖 Starting smart tender analysis synchronously for tender-${tenderId}...`);
    const { analysis, boq_json } = await analyzeTender(filePath, tenderId, onPhaseOneComplete);
    db.prepare('UPDATE tenders SET analysis = ?, boq_json = ?, status = ? WHERE id = ?')
      .run(analysis, boq_json, 'נותח', tenderId);
    console.log(`✅ Phase 2 deep analysis + BoQ saved for tender ${tenderId}`);
    
    res.json({ success: true });
  } catch (err) {
    console.error('AI Analysis failed for tender:', tenderId, err);
    const errorMsg = `שגיאה בניתוח המכרז: ${err.message}\n${err.stack || ''}`;
    db.prepare('UPDATE tenders SET status = ?, analysis = ? WHERE id = ?').run('שגיאה', errorMsg, tenderId);
    res.status(500).json({ error: 'AI Analysis failed', details: err.message });
  }
});

app.post('/api/tenders/:id/proposal', async (req, res) => {
  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(req.params.id);
  if (!tender) return res.status(404).json({ error: 'Tender not found' });

  console.log(`🤖 Starting proposal generation synchronously for tender-${req.params.id}...`);
  try {
    const { proposal, boq_json } = await generateProposal(path.join(UPLOADS_DIR, tender.filename), req.params.id);
    
    // Update tender record (keep status as 'הועבר לפרויקט' if it was already converted, or change to 'מוכן')
    const nextStatus = tender.status === 'הועבר לפרויקט' ? 'הועבר לפרויקט' : 'מוכן';
    db.prepare('UPDATE tenders SET proposal = ?, boq_json = COALESCE(?, boq_json), status = ? WHERE id = ?').run(proposal, boq_json, nextStatus, req.params.id);
    
    // Also save the proposal in the converted project if it exists!
    db.prepare('UPDATE projects SET proposal = ?, boq_json = COALESCE(?, boq_json) WHERE tender_id = ?').run(proposal, boq_json, req.params.id);
    
    console.log(`✅ Proposal generation complete for tender-${req.params.id} (updated tender and project if exists)`);
    
    // גיבוי מיידי לענן של בסיס הנתונים עם הצעת המחיר שנוצרה
    await db.backupToCloud().catch(err => console.error('GCS backup failed after proposal:', err.message));
  } catch (e) {
    console.error(`❌ Proposal generation failed for tender-${req.params.id}:`, e);
    db.prepare('UPDATE tenders SET status = ? WHERE id = ?').run('שגיאה', req.params.id);
  }
  res.json({ success: true });
});

app.post('/api/tenders/:id/convert-to-project', async (req, res) => {
  const tenderId = Number(req.params.id);
  console.log(`💼 Converting tender ${tenderId} to an active project...`);
  
  try {
    const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(tenderId);
    if (!tender) {
      return res.status(404).json({ error: 'Tender not found' });
    }
    
    // 1. Create active project (strip extension from tender name)
    const projectName = tender.name.replace(/\.[^/.]+$/, "");
    const location = 'לא הוגדר';
    // Default estimated completion: 6 months out
    const endDate = new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0];
    
    const insertProject = db.prepare(`
      INSERT INTO projects (name, location, end_date, status, tender_id, analysis, proposal, boq_json) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const projectInfo = insertProject.run(
      projectName, 
      location, 
      endDate, 
      'תקין', 
      tender.id, 
      tender.analysis || '', 
      tender.proposal || '', 
      tender.boq_json || ''
    );
    const newProjectId = projectInfo.lastInsertRowid;
    
    // 2. Link file to project files (so it shows in documents page)
    const insertFile = db.prepare('INSERT INTO files (project_id, filename, original_name, upload_date) VALUES (?, ?, ?, ?)');
    insertFile.run(newProjectId, tender.filename, tender.name, new Date().toISOString());
    
    // 3. Populate budgets from BOQ JSON
    if (tender.boq_json) {
      try {
        const boqItems = JSON.parse(tender.boq_json);
        if (Array.isArray(boqItems)) {
          const categoryTotals = {};
          for (const item of boqItems) {
            const category = item.section || 'כללי';
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unitPrice) || 0;
            const total = qty * price;
            categoryTotals[category] = (categoryTotals[category] || 0) + total;
          }
          
          const insertBudget = db.prepare('INSERT INTO budgets (project_id, category, total_amount) VALUES (?, ?, ?)');
          for (const [category, total_amount] of Object.entries(categoryTotals)) {
            insertBudget.run(newProjectId, category, total_amount);
          }
          console.log(`💰 Created budgets for ${newProjectId} from tender BOQ items`);
        }
      } catch (e) {
        console.error('Failed to parse/convert BOQ JSON to budgets:', e);
      }
    }
    
    // 4. Update tender RAG chunk IDs to project ID in vector DB (instant!)
    let updatedChunks = 0;
    if (Array.isArray(vectorStore?.data)) {
      vectorStore.data.forEach(item => {
        if (item.metadata?.projectId === `tender-${tenderId}`) {
          item.metadata.projectId = newProjectId.toString();
          updatedChunks++;
        }
      });
      if (updatedChunks > 0) {
        fs.writeFileSync(VECTOR_DB_PATH, JSON.stringify(vectorStore.data));
        console.log(`⚡ Re-indexed ${updatedChunks} chunks from tender-${tenderId} to project ${newProjectId}`);
      }
    }
    
    // Fallback: if no chunks were found (e.g. background ingest still running), run ingest
    if (updatedChunks === 0) {
      const filePath = path.join(UPLOADS_DIR, tender.filename);
      ingestDocument(newProjectId, filePath).catch(e => {
        console.error(`RAG Ingest failed for project ${newProjectId}:`, e);
      });
    }
    
    // 5. Update tender status to indicate it has been successfully transferred
    db.prepare("UPDATE tenders SET status = 'הועבר לפרויקט' WHERE id = ?").run(tenderId);
    
    // Backup DB
    db.backupToCloud().catch(e => console.error('Cloud backup failed:', e));
    
    res.json({ success: true, projectId: newProjectId });
  } catch (err) {
    console.error('Tender conversion failed:', err);
    res.status(500).json({ error: 'Failed to convert tender to project', details: err.message });
  }
});

app.post('/api/tenders/:id/reset-proposal', (req, res) => {
  const tid = Number(req.params.id);
  try {
    const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(tid);
    if (!tender) return res.status(404).json({ error: 'Tender not found' });
    
    const nextStatus = tender.status === 'הועבר לפרויקט' ? 'הועבר לפרויקט' : 'נותח';
    db.prepare("UPDATE tenders SET proposal = NULL, status = ? WHERE id = ?").run(nextStatus, tid);
    
    // Also clear proposal in the converted project if it exists!
    db.prepare("UPDATE projects SET proposal = NULL WHERE tender_id = ?").run(tid);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to reset proposal:', err);
    res.status(500).json({ error: 'Failed to reset proposal', details: err.message });
  }
});

app.get('/api/tenders/:id/files', (req, res) => {
  const tenderId = Number(req.params.id);
  const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(tenderId);
  if (!tender) return res.status(404).json({ error: 'Tender not found' });
  res.json([{
    id: tender.id,
    original_name: tender.name,
    filename: tender.filename,
    upload_date: tender.upload_date,
    url: `/uploads/${tender.filename}`
  }]);
});

app.post('/api/tenders/:id/chat', async (req, res) => {
  const tenderId = Number(req.params.id);
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required' });
  
  try {
    const answer = await askQuestion(`tender-${tenderId}`, question);
    res.json({ answer });
  } catch (e) {
    console.error('Tender QA failed:', e);
    res.status(500).json({ error: 'AI error during tender Q&A' });
  }
});

// --- AI Aliases from old API ---
app.post('/api/analyze-tender', (req, res) => res.redirect(307, '/api/tenders'));

app.post('/api/global-knowledge', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');
  try {
    // העלאת הקובץ לגיבוי בענן על מנת שלא יאבד במעבר בין שרתים
    await uploadFileToCloud(req.file.path, req.file.filename).catch(e => 
      console.error(`☁️ GCS upload failed for global knowledge:`, e)
    );
    await ingestDocument('global', req.file.path);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to ingest document' });
  }
});

app.get('/api/expenses', (req, res) => { // קבלת כל ההוצאות מהמערכת
  const projectId = req.query.projectId || req.query.project_id; // בודקים אם המשתמש סינן לפי פרויקט מסוים
  let query = `
    SELECT e.*, 
           c.name as contractor_name, 
           b.category as budget_category, 
           p.name as project_name 
    FROM expenses e
    LEFT JOIN contractors c ON e.contractor_id = c.id
    LEFT JOIN budgets b ON e.budget_id = b.id
    LEFT JOIN projects p ON e.project_id = p.id
  `; // שאילתה המשלבת מידע על קבלנים, סעיפי תקציב ושמות פרויקטים
  let expenses; // משתנה לשמירת התוצאות
  if (projectId) { // אם התבקש סינון לפי פרויקט
    query += ' WHERE e.project_id = ?'; // מוסיפים תנאי סינון לשאילתה
    expenses = db.prepare(query).all(projectId); // מריצים את השאילתה עם מזהה הפרויקט
  } else { // אם לא התבקש סינון
    expenses = db.prepare(query).all(); // מביאים את כל ההוצאות ללא הגבלה
  }
  res.json(expenses); // מחזירים את התוצאות כקובץ JSON לפרונט
});
app.get('/api/incomes', (req, res) => res.json(db.prepare('SELECT * FROM incomes').all()));
app.get('/api/contractors', (req, res) => res.json(db.prepare('SELECT * FROM contractors').all()));
app.get('/api/orders', (req, res) => res.json(db.prepare('SELECT * FROM orders').all()));
app.get('/api/budgets', (req, res) => res.json(db.prepare('SELECT * FROM budgets').all()));

app.post('/api/expenses', (req, res) => {
  const { project_id, budget_id, contractor_id, amount, date, description } = req.body;
  const insert = db.prepare('INSERT INTO expenses (project_id, budget_id, contractor_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?)');
  const info = insert.run(project_id, budget_id, contractor_id, amount, date, description);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.post('/api/incomes', (req, res) => {
  const { project_id, amount, date, description } = req.body;
  const insert = db.prepare('INSERT INTO incomes (project_id, amount, date, description) VALUES (?, ?, ?, ?)');
  const info = insert.run(project_id, amount, date, description);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.post('/api/contractors', async (req, res) => {
  const { name, specialization, phone, email } = req.body;
  const insert = db.prepare('INSERT INTO contractors (name, specialization, phone, email) VALUES (?, ?, ?, ?)');
  const info = insert.run(name, specialization, phone, email);
  const newId = info.lastInsertRowid;
  
  const createdContractor = { id: newId, name, specialization, phone, email };
  syncContractorToMonday(createdContractor, 'create');
  
  res.status(201).json({ id: newId });
});

app.put('/api/contractors/:id', async (req, res) => {
  const { name, specialization, phone, email } = req.body;
  const cid = Number(req.params.id);
  db.prepare('UPDATE contractors SET name = ?, specialization = ?, phone = ?, email = ? WHERE id = ?')
    .run(name, specialization, phone, email, cid);
    
  const updatedContractor = db.prepare('SELECT * FROM contractors WHERE id = ?').get(cid);
  if (updatedContractor) {
    syncContractorToMonday(updatedContractor, 'update');
  }
  res.json({ success: true });
});

app.get('/api/settings/monday-contractors', (req, res) => {
  const token = db.prepare("SELECT value FROM settings WHERE key = 'monday_contractors_token'").get()?.value || '';
  const boardId = db.prepare("SELECT value FROM settings WHERE key = 'monday_contractors_board_id'").get()?.value || '';
  const autoSync = db.prepare("SELECT value FROM settings WHERE key = 'monday_contractors_auto_sync'").get()?.value || '1';
  res.json({ token, boardId, autoSync: autoSync === '1' });
});

app.post('/api/settings/monday-contractors', (req, res) => {
  const { token, boardId, autoSync } = req.body;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('monday_contractors_token', ?)")
    .run(token || '');
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('monday_contractors_board_id', ?)")
    .run(boardId || '');
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('monday_contractors_auto_sync', ?)")
    .run(autoSync ? '1' : '0');
  res.json({ success: true });
});

app.post('/api/contractors/export-monday', async (req, res) => {
  try {
    const token = db.prepare("SELECT value FROM settings WHERE key = 'monday_contractors_token'").get()?.value || '';
    const boardId = db.prepare("SELECT value FROM settings WHERE key = 'monday_contractors_board_id'").get()?.value || '';
    if (!token || !boardId) return res.status(400).json({ error: 'Missing token or boardId' });

    const contractors = db.prepare('SELECT * FROM contractors').all();
    let exported = 0;

    const getGroupId = (spec = '') => {
      const s = spec.toLowerCase();
      if (s.includes('פיתוח') || s.includes('חוץ') || s.includes('גינון') || s.includes('סלילה')) return 'group_mm44qxqq';
      if (s.includes('חשמל') || s.includes('אינסטלציה') || s.includes('תשתיות') || s.includes('מים') || s.includes('מיזוג') || s.includes('קירור') || s.includes('כיבוי')) return 'group_mm44hzkm';
      if (s.includes('גמר') || s.includes('צבע') || s.includes('ריצוף') || s.includes('גבס') || s.includes('טיח') || s.includes('אלומיניום') || s.includes('נגרות')) return 'group_mm441brs';
      if (s.includes('שלד') || s.includes('בנייה') || s.includes('בטון') || s.includes('קונסטרוקציה') || s.includes('קידוח') || s.includes('חפירה') || s.includes('עפר')) return 'group_mm44cs14';
      return 'topics';
    };

    for (const contractor of contractors) {
      const groupId = getGroupId(contractor.specialization);
      const dateStr = new Date().toISOString().split('T')[0];
      const notesStr = `טלפון: ${contractor.phone || ''}, דוא"ל: ${contractor.email || ''}`;

      const colValues = JSON.stringify({
        date_mm44879k: dateStr,
        text_mm44tthd: contractor.specialization || '',
        text_mm44k583: 'יצוא יזום בארסוף',
        text_mm44vndq: notesStr
      });

      const query = `mutation {
        create_item (
          board_id: ${boardId},
          group_id: "${groupId}",
          item_name: "${contractor.name.replace(/"/g, '\\"')}",
          column_values: ${JSON.stringify(colValues)}
        ) {
          id
        }
      }`;

      const itemRes = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
        body: JSON.stringify({ query })
      });
      const itemData = await itemRes.json();
      if (itemData.data?.create_item?.id) {
        const mondayId = itemData.data.create_item.id;
        db.prepare('UPDATE contractors SET monday_id = ? WHERE id = ?').run(mondayId, contractor.id);
        exported++;
      }
    }

    res.json({ success: true, exported });
  } catch (err) {
    console.error('Export contractors failed:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/orders', (req, res) => {
  const { project_id, supplier_name, item_description, amount, order_date, status } = req.body;
  const insert = db.prepare('INSERT INTO orders (project_id, supplier_name, item_description, amount, order_date, status) VALUES (?, ?, ?, ?, ?, ?)');
  const info = insert.run(project_id, supplier_name, item_description, amount, order_date, status);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.post('/api/budgets', (req, res) => {
  const { project_id, category, total_amount } = req.body;
  const insert = db.prepare('INSERT INTO budgets (project_id, category, total_amount) VALUES (?, ?, ?)');
  const info = insert.run(project_id, category, total_amount);
  res.status(201).json({ id: info.lastInsertRowid });
});

// עדכון פרטי מכרז קיים בבסיס הנתונים (למשל שמירת כתב כמויות מעודכן מהמחשבון)
app.put('/api/tenders/:id', (req, res) => {
  const { id } = req.params;
  const { boq_json, analysis, proposal, status } = req.body;
  const tid = Number(id);

  try {
    const tender = db.prepare('SELECT * FROM tenders WHERE id = ?').get(tid);
    if (!tender) return res.status(404).json({ error: 'מכרז לא נמצא' });

    db.prepare(`
      UPDATE tenders 
      SET 
        boq_json = COALESCE(?, boq_json),
        analysis = COALESCE(?, analysis),
        proposal = COALESCE(?, proposal),
        status = COALESCE(?, status)
      WHERE id = ?
    `).run(boq_json, analysis, proposal, status, tid);

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to update tender:', err);
    res.status(500).json({ error: 'נכשל בעדכון המכרז', details: err.message });
  }
});

app.put('/api/:resourceType/:id', (req, res) => {
  // Generic fallback for PUT (simplified for safety, normally explicitly defined)
  res.json({ success: true, warning: 'Generic update placeholder' });
});

app.delete('/api/:resourceType/:id', async (req, res) => {
  const { resourceType, id } = req.params;
  const pid = Number(id);
  const allowedTables = ['projects', 'expenses', 'incomes', 'budgets', 'orders', 'contractors', 'tenders'];
  if (allowedTables.includes(resourceType)) {
    if (resourceType === 'contractors') {
      const contractor = db.prepare('SELECT * FROM contractors WHERE id = ?').get(pid);
      if (contractor) {
        syncContractorToMonday(contractor, 'delete', { mondayId: contractor.monday_id });
      }
    }
    db.prepare(`DELETE FROM ${resourceType} WHERE id = ?`).run(pid);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid resource type' });
  }
});

app.get('/api/notifications', (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const tasks = db.prepare(`
      SELECT t.*, p.name as project_name 
      FROM tasks t 
      JOIN projects p ON t.project_id = p.id
    `).all();

    const alerts = [];
    tasks.forEach(task => {
      if (task.progress < 100 && task.end_date && task.end_date < todayStr) {
        alerts.push({
          id: `overdue-${task.id}`,
          type: 'danger',
          title: 'משימה בעיכוב ביצוע',
          message: `המשימה "${task.name}" בפרויקט "${task.project_name}" הייתה אמורה להסתיים ב-${new Date(task.end_date).toLocaleDateString('he-IL')}, אך התקדמותה היא ${task.progress}% בלבד.`,
          projectId: task.project_id
        });
      } else if (task.progress === 0 && task.start_date && task.start_date < todayStr) {
        alerts.push({
          id: `start-delay-${task.id}`,
          type: 'warning',
          title: 'עיכוב בתחילת עבודה',
          message: `המשימה "${task.name}" בפרויקט "${task.project_name}" תוכננה להתחיל ב-${new Date(task.start_date).toLocaleDateString('he-IL')}, אך טרם החלה.`,
          projectId: task.project_id
        });
      }
    });

    res.json(alerts);
  } catch (e) {
    console.error('Failed to calculate notifications:', e);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Daily Logs API
app.get('/api/daily-logs', (req, res) => {
  const { projectId } = req.query;
  const logs = projectId 
    ? db.prepare('SELECT * FROM daily_logs WHERE project_id = ? ORDER BY date DESC').all(projectId)
    : db.prepare('SELECT * FROM daily_logs ORDER BY date DESC').all();
  res.json(logs);
});

app.post('/api/daily-logs', (req, res) => {
  const { project_id, date, manager_name, weather, workers_count, notes, image_url } = req.body;
  const stmt = db.prepare('INSERT INTO daily_logs (project_id, date, manager_name, weather, workers_count, notes, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(project_id, date, manager_name, weather, workers_count, notes, image_url);
  res.json({ id: result.lastInsertRowid });
});

// Warranty Tickets API
app.get('/api/warranty-tickets', (req, res) => {
  const { projectId } = req.query;
  const tickets = projectId 
    ? db.prepare('SELECT * FROM warranty_tickets WHERE project_id = ? ORDER BY open_date DESC').all(projectId)
    : db.prepare('SELECT * FROM warranty_tickets ORDER BY open_date DESC').all();
  res.json(tickets);
});

app.post('/api/warranty-tickets', (req, res) => {
  const { project_id, client_name, phone, apartment, issue_description, open_date, status } = req.body;
  const stmt = db.prepare('INSERT INTO warranty_tickets (project_id, client_name, phone, apartment, issue_description, open_date, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const result = stmt.run(project_id, client_name, phone, apartment, issue_description, open_date, status || 'פתוחה');
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/warranty-tickets/:id', (req, res) => {
  const { status, close_date } = req.body;
  const stmt = db.prepare('UPDATE warranty_tickets SET status = ?, close_date = ? WHERE id = ?');
  stmt.run(status, close_date, req.params.id);
  res.json({ success: true });
});

// פונקציית עזר לסנכרון קבלנים מול Monday.com בזמן אמת
async function syncContractorToMonday(contractor, action, extra = {}) {
  try {
    const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'monday_contractors_token'").get();
    const boardIdRow = db.prepare("SELECT value FROM settings WHERE key = 'monday_contractors_board_id'").get();
    const autoSyncRow = db.prepare("SELECT value FROM settings WHERE key = 'monday_contractors_auto_sync'").get();
    
    if (!tokenRow || !boardIdRow || !autoSyncRow || autoSyncRow.value !== '1') return;
    
    const token = tokenRow.value;
    const boardId = boardIdRow.value;
    
    const getGroupId = (spec = '') => {
      const s = spec.toLowerCase();
      if (s.includes('פיתוח') || s.includes('חוץ') || s.includes('גינון') || s.includes('סלילה')) return 'group_mm44qxqq';
      if (s.includes('חשמל') || s.includes('אינסטלציה') || s.includes('תשתיות') || s.includes('מים') || s.includes('מיזוג') || s.includes('קירור') || s.includes('כיבוי')) return 'group_mm44hzkm';
      if (s.includes('גמר') || s.includes('צבע') || s.includes('ריצוף') || s.includes('גבס') || s.includes('טיח') || s.includes('אלומיניום') || s.includes('נגרות')) return 'group_mm441brs';
      if (s.includes('שלד') || s.includes('בנייה') || s.includes('בטון') || s.includes('קונסטרוקציה') || s.includes('קידוח') || s.includes('חפירה') || s.includes('עפר')) return 'group_mm44cs14';
      return 'topics';
    };
    
    const groupId = getGroupId(contractor.specialization);
    const dateStr = new Date().toISOString().split('T')[0];
    const notesStr = `טלפון: ${contractor.phone || ''}, דוא"ל: ${contractor.email || ''}`;
    
    if (action === 'create') {
      const colValues = JSON.stringify({
        date_mm44879k: dateStr,
        text_mm44tthd: contractor.specialization || '',
        text_mm44k583: 'מערכת בארסוף',
        text_mm44vndq: notesStr
      });
      
      const query = `mutation {
        create_item (
          board_id: ${boardId},
          group_id: "${groupId}",
          item_name: "${contractor.name.replace(/"/g, '\\"')}",
          column_values: ${JSON.stringify(colValues)}
        ) {
          id
        }
      }`;
      
      const res = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (data.data?.create_item?.id) {
        const mondayId = data.data.create_item.id;
        db.prepare('UPDATE contractors SET monday_id = ? WHERE id = ?').run(mondayId, contractor.id);
      }
    } else if (action === 'update') {
      if (!contractor.monday_id) return;
      
      const colValues = JSON.stringify({
        date_mm44879k: dateStr,
        text_mm44tthd: contractor.specialization || '',
        text_mm44k583: 'מערכת בארסוף',
        text_mm44vndq: notesStr
      });
      
      const query = `mutation {
        change_multiple_column_values (
          board_id: ${boardId},
          item_id: ${contractor.monday_id},
          column_values: ${JSON.stringify(colValues)}
        ) {
          id
        }
      }`;
      
      await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
        body: JSON.stringify({ query })
      });

      const updateMsg = `פרטי קבלן עודכנו בבארסוף: התמחות ב-${contractor.specialization || ''}, טלפון: ${contractor.phone || ''}, מייל: ${contractor.email || ''}`;
      const updateQuery = `mutation {
        create_update (item_id: ${contractor.monday_id}, body: "${updateMsg.replace(/"/g, '\\"')}") {
          id
        }
      }`;
      await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
        body: JSON.stringify({ query: updateQuery })
      });
    } else if (action === 'delete') {
      const mondayId = extra.mondayId || contractor.monday_id;
      if (!mondayId) return;
      
      const query = `mutation {
        delete_item (item_id: ${mondayId}) {
          id
        }
      }`;
      
      await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
        body: JSON.stringify({ query })
      });
    }
  } catch (err) {
    console.error('Real-time Monday contractor sync failed:', err.message);
  }
}

// פונקציית עזר לסנכרון משימה בודדת מול Monday.com בזמן אמת
async function syncTaskToMonday(projectId, task, action, extra = {}) { // הגדרת הפונקציה לקריאות רקע
  try { // תפיסת שגיאות
    const project = db.prepare('SELECT monday_token, monday_board_id, monday_auto_sync FROM projects WHERE id = ?').get(projectId); // שליפת הגדרות מאנדיי מהפרויקט
    if (!project || !project.monday_token || !project.monday_board_id || !project.monday_auto_sync) return; // בדיקה אם מופעל סנכרון אוטומטי ואם יש הגדרות
    
    const token = project.monday_token; // מפתח הגישה של מאנדיי
    const boardId = project.monday_board_id; // מזהה הלוח

    if (action === 'create') { // מקרה של יצירת משימה חדשה
      const query = `mutation {
        create_item (board_id: ${boardId}, item_name: "${task.name.replace(/"/g, '\\"')}") {
          id
        }
      }`; // שאילתת GraphQL ליצירת פריט
      const res = await fetch('https://api.monday.com/v2', { // פנייה ל-API
        method: 'POST', // בשיטת POST
        headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' }, // כותרות מתאימות
        body: JSON.stringify({ query }) // שליחת השאילתה
      });
      const data = await res.json(); // פענוח התשובה
      if (data.data?.create_item?.id) { // אם הפריט נוצר בהצלחה
        const mondayId = data.data.create_item.id; // שמירת המזהה החדש
        db.prepare('UPDATE tasks SET monday_id = ? WHERE id = ?').run(mondayId, task.id); // עדכון מזהה מאנדיי בטבלה המקומית
        // עדכון תאריכים והתקדמות עבור המשימה שנוצרה
        await syncTaskToMonday(projectId, { ...task, monday_id: mondayId }, 'update'); // הרצת עדכון עמודות
      }
    } else if (action === 'update') { // מקרה של עדכון משימה קיימת
      if (!task.monday_id) return; // אם אין מזהה מאנדיי למשימה, אין מה לעדכן
      
      // מיפוי שלבי התקדמות לסטטוסים במאנדיי
      let statusText = 'Not Started'; // ברירת מחדל לא התחיל
      if (task.progress === 100) statusText = 'Done'; // אם 100% מסמנים כבוצע
      else if (task.progress > 0) statusText = 'Working on it'; // אם בטווח הביניים מסמנים כבעבודה
      
      const start = task.start_date || new Date().toISOString().split('T')[0]; // תאריך התחלה תקין
      const end = task.end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]; // תאריך סיום תקין
      
      const colValues = JSON.stringify({ // בניית אובייקט ערכי העמודות
        status: { label: statusText }, // סטטוס משימה
        numbers: task.progress, // אחוז התקדמות
        timeline: { from: start, to: end } // טווח תאריכים
      });
      
      const query = `mutation {
        change_multiple_column_values (
          board_id: ${boardId},
          item_id: ${task.monday_id},
          column_values: ${JSON.stringify(colValues)}
        ) {
          id
        }
      }`; // שאילתת עדכון עמודות במאנדיי
      await fetch('https://api.monday.com/v2', { // ביצוע הפנייה
        method: 'POST', // שליחת POST
        headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' }, // כותרות
        body: JSON.stringify({ query }) // שליחת השאילתה
      });

      const updateMsg = `המשימה עודכנה בבארסוף: התקדמות ל-${task.progress}%, תאריכים: ${start} עד ${end}`;
      const updateQuery = `mutation {
        create_update (item_id: ${task.monday_id}, body: "${updateMsg.replace(/"/g, '\\"')}") {
          id
        }
      }`;
      await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
        body: JSON.stringify({ query: updateQuery })
      });
    } else if (action === 'delete') { // מקרה של מחיקת משימה
      const mondayId = extra.mondayId || task.monday_id; // קבלת מזהה מאנדיי למחיקה
      if (!mondayId) return; // יציאה אם אין מזהה
      
      const query = `mutation {
        delete_item (item_id: ${mondayId}) {
          id
        }
      }`; // שאילתת מחיקה ממאנדיי
      await fetch('https://api.monday.com/v2', { // ביצוע הקריאה
        method: 'POST', // שיטת POST
        headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' }, // כותרות
        body: JSON.stringify({ query }) // שליחה
      });
    }
  } catch (err) { // תפיסת כשלים
    console.error('Real-time Monday sync failed:', err.message); // תיעוד הכשל למניעת קריסות
  }
}

// ===== Tasks API (Gantt) =====
app.get('/api/projects/:id/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY start_date ASC').all(req.params.id);
  res.json(tasks);
});

app.post('/api/projects/:id/tasks', async (req, res) => { // הגדרת פונקציה אסינכרונית לביצוע סנכרון ברקע
  const { name, start_date, end_date, progress } = req.body; // חילוץ הנתונים מגוף הבקשה
  const stmt = db.prepare('INSERT INTO tasks (project_id, name, start_date, end_date, progress) VALUES (?, ?, ?, ?, ?)'); // הכנת שאילתת ההוספה
  const result = stmt.run(req.params.id, name, start_date, end_date, progress || 0); // הרצת ההוספה המקומית במסד
  const newTaskId = result.lastInsertRowid; // מזהה השורה שנוצרה
  
  const createdTask = { id: newTaskId, name, start_date, end_date, progress }; // בניית אובייקט המשימה שנוצרה
  syncTaskToMonday(req.params.id, createdTask, 'create'); // סנכרון המשימה החדשה ל-Monday ברקע ללא המתנה לעיכוב המשתמש
  
  res.json({ id: newTaskId }); // החזרת מזהה המשימה החדשה
});

app.put('/api/tasks/:id', async (req, res) => { // פונקציה אסינכרונית לעדכון משימה וסנכרונה
  const { name, start_date, end_date, progress } = req.body; // חילוץ נתונים מעודכנים
  db.prepare('UPDATE tasks SET name = ?, start_date = ?, end_date = ?, progress = ? WHERE id = ?') // הכנת שאילתת העדכון
    .run(name, start_date, end_date, progress || 0, req.params.id); // הרצת העדכון המקומי במסד הנתונים
  
  const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id); // שליפת המשימה המעודכנת מהמסד
  if (updatedTask) { // אם המשימה נמצאה
    syncTaskToMonday(updatedTask.project_id, updatedTask, 'update'); // עדכון המשימה במאנדיי ברקע
  }
  res.json({ success: true }); // החזרת תשובת הצלחה
});

app.delete('/api/tasks/:id', async (req, res) => { // מחיקת משימה וסנכרון מחיקה ממאנדיי
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id); // שליפת המשימה לפני מחיקתה מהמסד המקומי
  if (task) { // אם מצאנו את המשימה
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id); // ביצוע המחיקה המקומית
    syncTaskToMonday(task.project_id, task, 'delete', { mondayId: task.monday_id }); // שליחת בקשת מחיקה למאנדיי ברקע
  } else { // אם לא נמצאה המשימה
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id); // מריצים ליתר ביטחון
  }
  res.json({ success: true }); // החזרת אישור הצלחה
});

// ===== Monday.com Sync & Provisioning =====
app.post('/api/projects/:id/monday-credentials', (req, res) => { // שמירת הגדרות החיבור בשרת
  const { token, boardId, autoSync } = req.body; // חילוץ נתונים
  db.prepare('UPDATE projects SET monday_token = ?, monday_board_id = ?, monday_auto_sync = ? WHERE id = ?') // שאילתת עדכון
    .run(token || null, boardId || null, autoSync ? 1 : 0, req.params.id); // שמירה במסד
  res.json({ success: true }); // החזרת אישור הצלחה
});

app.post('/api/projects/:id/export-monday', async (req, res) => { // ייצוא כל המשימות ללוח חדש ב-Monday.com
  const { token } = req.body; // חילוץ הטוקן מהגוף
  if (!token) return res.status(400).json({ error: 'Missing token' }); // שגיאה אם חסר טוקן
  
  try { // תפיסת כשלים
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id); // שליפת הפרויקט המקומי
    if (!project) return res.status(404).json({ error: 'Project not found' }); // שגיאה אם לא נמצא
    
    // 1. יצירת לוח חדש במאנדיי
    const createBoardQuery = `mutation {
      create_board (board_name: "בארסוף - ${project.name.replace(/"/g, '\\"')}", board_kind: public) {
        id
      }
    }`; // שאילתה ליצירת הלוח
    const boardRes = await fetch('https://api.monday.com/v2', { // פנייה ל-Monday
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
      body: JSON.stringify({ query: createBoardQuery })
    });
    const boardData = await boardRes.json(); // פענוח התשובה
    if (boardData.errors) throw new Error('Monday board creation failed: ' + boardData.errors[0]?.message); // שגיאה אם נכשל
    
    const boardId = boardData.data.create_board.id; // מזהה הלוח החדש שנוצר
    
    // 2. יצירת עמודות התקדמות (numbers) ולוח זמנים (timeline) בלוח שנוצר
    const createTimelineColQuery = `mutation {
      create_column (board_id: ${boardId}, title: "לוח זמנים", column_type: timeline) {
        id
      }
    }`; // עמודת תאריכים
    const timelineRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
      body: JSON.stringify({ query: createTimelineColQuery })
    });
    
    const createProgressColQuery = `mutation {
      create_column (board_id: ${boardId}, title: "התקדמות %", column_type: numbers) {
        id
      }
    }`; // עמודת אחוז התקדמות
    const progressRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
      body: JSON.stringify({ query: createProgressColQuery })
    });
    
    // 3. עדכון מסד הנתונים עם מזהה הלוח והטוקן
    db.prepare('UPDATE projects SET monday_board_id = ?, monday_token = ?, monday_auto_sync = 1 WHERE id = ?')
      .run(boardId, token, req.params.id);
      
    // 4. ייצוא כל המשימות הקיימות של הפרויקט ללוח החדש
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(req.params.id); // שליפת כל המשימות
    let exported = 0; // מונה משימות שיוצאו בהצלחה
    
    for (const task of tasks) { // מעבר על המשימות
      const createItemQuery = `mutation {
        create_item (board_id: ${boardId}, item_name: "${task.name.replace(/"/g, '\\"')}") {
          id
        }
      }`; // יצירת הפריט במאנדיי
      const itemRes = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
        body: JSON.stringify({ query: createItemQuery })
      });
      const itemData = await itemRes.json(); // פענוח מזהה הפריט
      
      if (itemData.data?.create_item?.id) { // אם נוצר פריט תקין
        const mondayItemId = itemData.data.create_item.id; // קבלת המזהה
        db.prepare('UPDATE tasks SET monday_id = ? WHERE id = ?').run(mondayItemId, task.id); // שמירה במסד הנתונים
        
        // עדכון ערכי העמודות עבור המשימה שנוצרה (תאריכים והתקדמות)
        let statusText = 'Not Started'; // ברירת מחדל
        if (task.progress === 100) statusText = 'Done';
        else if (task.progress > 0) statusText = 'Working on it';
        
        const start = task.start_date || new Date().toISOString().split('T')[0];
        const end = task.end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        
        const colValues = JSON.stringify({
          status: { label: statusText },
          numbers: task.progress,
          timeline: { from: start, to: end }
        });
        
        const updateColsQuery = `mutation {
          change_multiple_column_values (
            board_id: ${boardId},
            item_id: ${mondayItemId},
            column_values: ${JSON.stringify(colValues)}
          ) {
            id
          }
        }`; // עדכון עמודות במאנדיי
        await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': token, 'API-Version': '2024-01' },
          body: JSON.stringify({ query: updateColsQuery })
        });
        exported++; // העלאת המונה
      } // סיום התנאי
    } // סיום הלולאה
    
    res.json({ success: true, boardId, exported }); // החזרת תוצאת ההצלחה עם המזהה והכמות
  } catch (err) { // תפיסת כשלים
    console.error('Export to Monday failed:', err); // הדפסת כשל ללוג
    res.status(500).json({ error: err.message }); // החזרת שגיאה לפרונט
  }
});

app.post('/api/projects/:id/export-monday-premium', async (req, res) => { // ייצוא פרימיום מתקדם ללוח בנייה מובנה במאנדיי
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // פונקציית עזר לביצוע פניות מול Monday API
    const mondayRequest = async (query) => {
      const res = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
          'API-Version': '2024-01'
        },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      if (data.errors) {
        throw new Error(data.errors[0]?.message || 'Monday API error');
      }
      return data;
    };

    // 1. יצירת לוח חדש
    const createBoardQuery = `mutation {
      create_board (board_name: "בארסוף פרימיום - ${project.name.replace(/"/g, '\\"')}", board_kind: public) {
        id
      }
    }`;
    const boardData = await mondayRequest(createBoardQuery);
    const boardId = boardData.data.create_board.id;

    // 2. יצירת עמודות מתקדמות
    let timelineColId = '';
    let progressColId = '';
    let statusColId = '';
    let priorityColId = '';
    let plannedBudgetColId = '';
    let actualCostColId = '';
    let ownerColId = '';

    try {
      const colRes = await mondayRequest(`mutation { create_column (board_id: ${boardId}, title: "לוח זמנים", column_type: timeline) { id } }`);
      timelineColId = colRes.data.create_column.id;
    } catch (e) { console.error('Failed to create timeline col:', e.message); }

    try {
      const colRes = await mondayRequest(`mutation { create_column (board_id: ${boardId}, title: "התקדמות %", column_type: numbers) { id } }`);
      progressColId = colRes.data.create_column.id;
    } catch (e) { console.error('Failed to create progress col:', e.message); }

    try {
      const colRes = await mondayRequest(`mutation { create_column (board_id: ${boardId}, title: "סטטוס ביצוע", column_type: status) { id } }`);
      statusColId = colRes.data.create_column.id;
    } catch (e) { console.error('Failed to create status col:', e.message); }

    try {
      const colRes = await mondayRequest(`mutation { create_column (board_id: ${boardId}, title: "עדיפות", column_type: status) { id } }`);
      priorityColId = colRes.data.create_column.id;
    } catch (e) { console.error('Failed to create priority col:', e.message); }

    try {
      const colRes = await mondayRequest(`mutation { create_column (board_id: ${boardId}, title: "תקציב מתוכנן (₪)", column_type: numbers) { id } }`);
      plannedBudgetColId = colRes.data.create_column.id;
    } catch (e) { console.error('Failed to create planned budget col:', e.message); }

    try {
      const colRes = await mondayRequest(`mutation { create_column (board_id: ${boardId}, title: "עלות בפועל (₪)", column_type: numbers) { id } }`);
      actualCostColId = colRes.data.create_column.id;
    } catch (e) { console.error('Failed to create actual cost col:', e.message); }

    try {
      const colRes = await mondayRequest(`mutation { create_column (board_id: ${boardId}, title: "אחראי", column_type: people) { id } }`);
      ownerColId = colRes.data.create_column.id;
    } catch (e) { console.error('Failed to create owner col:', e.message); }

    // 3. יצירת 5 קבוצות בנייה בלוח בסדר הפוך (כדי שהסדר בלוח יהיה ישר מלמעלה למטה)
    const groupNames = [
      "שלב ה': מסירה ושנת בדק",
      "שלב ד': גמר ומערכות",
      "שלב ג': שלד וקונסטרוקציה",
      "שלב ב': תשתיות ויסודות",
      "שלב א': תכנון ורישוי"
    ];
    const groupMap = {};
    for (const groupName of groupNames) {
      try {
        const groupRes = await mondayRequest(`mutation {
          create_group (board_id: ${boardId}, group_name: "${groupName}") {
            id
          }
        }`);
        if (groupRes.data?.create_group?.id) {
          groupMap[groupName] = groupRes.data.create_group.id;
        }
      } catch (e) {
        console.error(`Failed to create group ${groupName}:`, e.message);
      }
    }

    // 4. ניקוי קבוצות ברירת מחדל של הלוח שאינן שייכות ל-5 שלבי הבנייה שלנו
    try {
      const boardInfo = await mondayRequest(`query {
        boards (ids: [${boardId}]) {
          groups {
            id
            title
          }
        }
      }`);
      const existingGroups = boardInfo.data?.boards?.[0]?.groups || [];
      const customGroupTitles = new Set([
        "שלב א': תכנון ורישוי",
        "שלב ב': תשתיות ויסודות",
        "שלב ג': שלד וקונסטרוקציה",
        "שלב ד': גמר ומערכות",
        "שלב ה': מסירה ושנת בדק"
      ]);
      for (const g of existingGroups) {
        if (!customGroupTitles.has(g.title)) {
          try {
            await mondayRequest(`mutation {
              delete_group (board_id: ${boardId}, group_id: "${g.id}") {
                id
              }
            }`);
          } catch (e) {
            console.error(`Failed to delete default group ${g.title}:`, e.message);
          }
        }
      }
    } catch (e) {
      console.error('Failed to clean up default groups:', e.message);
    }

    // 5. סיווג משימות הפרויקט וייצואן לקבוצות המתאימות עם ערכי העמודות
    const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(req.params.id);
    let exported = 0;

    // פונקציית סיווג לפי מילים בעברית
    const classifyTaskGroup = (taskName) => {
      const name = taskName.toLowerCase();
      const planningKeywords = ['תכנון', 'רישוי', 'אישור', 'היתר', 'אדריכל', 'מהנדס', 'מדידה', 'תוכני', 'ייעוץ', 'חוזה', 'מכרז', 'בדיק'];
      const foundationsKeywords = ['תשתיות', 'יסוד', 'חפיר', 'דיפון', 'כלונס', 'ביסוס', 'מילוי', 'עפר', 'יישור'];
      const structureKeywords = ['שלד', 'קונסטרוקציה', 'בטון', 'ברזל', 'עמוד', 'תקר', 'קיר', 'יציק', 'בלוק', 'בנייה', 'ממ"ד', 'טפסנות', 'פיגום', 'מדרג'];
      const finishingKeywords = ['גמר', 'מערכת', 'חשמל', 'אינסטלציה', 'טיח', 'צבע', 'ריצוף', 'חיפוי', 'מיזוג', 'חלון', 'אלומיניום', 'דלת', 'גבס', 'שפכטל', 'סניטר', 'שיש', 'מטבח', 'איטום'];
      const handoverKeywords = ['מסיר', 'בדק', 'טופס 4', 'כיבוי אש', 'מפתח', 'אכלוס', 'פרוטוקול', 'נקי'];

      for (const kw of handoverKeywords) {
        if (name.includes(kw)) return "שלב ה': מסירה ושנת בדק";
      }
      for (const kw of finishingKeywords) {
        if (name.includes(kw)) return "שלב ד': גמר ומערכות";
      }
      for (const kw of structureKeywords) {
        if (name.includes(kw)) return "שלב ג': שלד וקונסטרוקציה";
      }
      for (const kw of foundationsKeywords) {
        if (name.includes(kw)) return "שלב ב': תשתיות ויסודות";
      }
      for (const kw of planningKeywords) {
        if (name.includes(kw)) return "שלב א': תכנון ורישוי";
      }
      return "שלב א': תכנון ורישוי"; // ברירת מחדל
    };

    for (const task of tasks) {
      const targetGroupTitle = classifyTaskGroup(task.name);
      const groupId = groupMap[targetGroupTitle] || '';

      // יצירת המשימה בקבוצה המתאימה במאנדיי
      const createItemQuery = `mutation {
        create_item (
          board_id: ${boardId},
          ${groupId ? `group_id: "${groupId}",` : ''}
          item_name: "${task.name.replace(/"/g, '\\"')}"
        ) {
          id
        }
      }`;

      const itemRes = await mondayRequest(createItemQuery);
      if (itemRes.data?.create_item?.id) {
        const mondayItemId = itemRes.data.create_item.id;
        db.prepare('UPDATE tasks SET monday_id = ? WHERE id = ?').run(mondayItemId, task.id);

        // בניית ערכי העמודות
        const colValues = {};

        // לוח זמנים
        if (timelineColId) {
          const start = task.start_date || new Date().toISOString().split('T')[0];
          const end = task.end_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
          colValues[timelineColId] = { from: start, to: end };
        }

        // אחוז התקדמות
        if (progressColId) {
          colValues[progressColId] = task.progress;
        }

        // סטטוס ביצוע
        if (statusColId) {
          let statusText = 'טרם החל';
          if (task.progress === 100) {
            statusText = 'הושלם';
          } else if (task.progress > 0) {
            statusText = 'בעבודה';
          } else {
            const todayStr = new Date().toISOString().split('T')[0];
            if (task.end_date && task.end_date < todayStr) {
              statusText = 'מעוכב';
            }
          }
          colValues[statusColId] = { label: statusText };
        }

        // עדיפות
        if (priorityColId) {
          let priorityLabel = 'בינונית';
          const nameLower = task.name.toLowerCase();
          if (nameLower.includes('יסוד') || nameLower.includes('שלד') || nameLower.includes('בטון') || nameLower.includes('איטום') || nameLower.includes('קריטי')) {
            priorityLabel = 'גבוהה';
          } else if (nameLower.includes('ניקיון') || nameLower.includes('צבע') || nameLower.includes('בדק')) {
            priorityLabel = 'נמוכה';
          }
          colValues[priorityColId] = { label: priorityLabel };
        }

        // חישוב תקציב מתוכנן ועלות בפועל מדומה למטרת תצוגה מרהיבה
        let plannedBudget = 15000;
        const nameLower = task.name.toLowerCase();
        if (nameLower.includes('שלד') || nameLower.includes('בטון') || nameLower.includes('קונסטרוקציה')) {
          plannedBudget = 85000;
        } else if (nameLower.includes('יסוד') || nameLower.includes('תשתיות') || nameLower.includes('חפירה')) {
          plannedBudget = 50000;
        } else if (nameLower.includes('גמר') || nameLower.includes('מערכות') || nameLower.includes('חשמל') || nameLower.includes('אינסטלציה')) {
          plannedBudget = 35000;
        } else if (nameLower.includes('טיח') || nameLower.includes('ריצוף') || nameLower.includes('צבע')) {
          plannedBudget = 20000;
        }
        const actualCost = Math.round(plannedBudget * (task.progress / 100));

        if (plannedBudgetColId) colValues[plannedBudgetColId] = plannedBudget;
        if (actualCostColId) colValues[actualCostColId] = actualCost;

        // עדכון עמודות במאנדיי
        const colValuesStr = JSON.stringify(colValues);
        const updateColsQuery = `mutation {
          change_multiple_column_values (
            board_id: ${boardId},
            item_id: ${mondayItemId},
            column_values: ${JSON.stringify(colValuesStr)}
          ) {
            id
          }
        }`;
        await mondayRequest(updateColsQuery);

        // הוספת הערה התחלתית (בועת עדכון)
        const updateMsg = `המשימה יוצאה מתוך בארסוף ללוח הפרימיום. התקדמות נוכחית: ${task.progress}%.`;
        const updateQuery = `mutation {
          create_update (item_id: ${mondayItemId}, body: "${updateMsg.replace(/"/g, '\\"')}") {
            id
          }
        }`;
        await mondayRequest(updateQuery);

        exported++;
      }
    }

    // 6. עדכון מסד הנתונים המקומי
    db.prepare('UPDATE projects SET monday_board_id = ?, monday_token = ?, monday_auto_sync = 1 WHERE id = ?')
      .run(boardId, token, req.params.id);

    res.json({ success: true, boardId, exported });
  } catch (err) {
    console.error('Premium export to Monday failed:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/sync-monday', async (req, res) => {
  const { token, boardId } = req.body;
  if (!token || !boardId) return res.status(400).json({ error: 'Missing token or boardId' });

  try {
    // שמירת ההגדרות החדשות בפרויקט
    db.prepare('UPDATE projects SET monday_token = ?, monday_board_id = ? WHERE id = ?').run(token, boardId, req.params.id);

    // שליפת פריטים מה-Monday API דרך GraphQL
    const query = `query {
      boards(ids: [${boardId}]) {
        items_page(limit: 100) {
          items {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      }
    }`;

    const mondayRes = await fetch('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
        'API-Version': '2024-01'
      },
      body: JSON.stringify({ query })
    });

    const mondayData = await mondayRes.json();
    
    if (mondayData.errors) {
      console.error('Monday API error:', mondayData.errors);
      return res.status(400).json({ error: 'Monday API error: ' + mondayData.errors[0]?.message });
    }

    const items = mondayData?.data?.boards?.[0]?.items_page?.items || [];
    if (items.length === 0) return res.status(404).json({ error: 'No items found on this board' });

    // מחיקת הישנות ושמירת חדשות
    db.prepare('DELETE FROM tasks WHERE project_id = ?').run(req.params.id);

    const today = new Date().toISOString().split('T')[0];
    let synced = 0;

    for (const item of items) {
      // חיפוש עמודות תאריך (timeline / date columns)
      let startDate = today;
      let endDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      let progress = 0;

      for (const col of item.column_values) {
        try {
          if (col.id === 'timeline' || col.id.includes('timeline')) {
            const val = JSON.parse(col.value || '{}');
            if (val.from) startDate = val.from;
            if (val.to) endDate = val.to;
          } else if (col.id === 'numbers' || col.id.includes('progress') || col.id.includes('percent')) {
            progress = Math.min(100, Math.max(0, parseInt(col.text || '0')));
          } else if (col.id === 'status' || col.id.includes('status')) {
            if (col.text === 'Done' || col.text === 'סיים') progress = 100;
            else if (col.text === 'Working on it' || col.text === 'בעבודה') progress = 50;
          }
        } catch (e) { /* עמודה לא רלוונטית */ }
      }

      db.prepare('INSERT INTO tasks (project_id, name, start_date, end_date, progress, monday_id) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.params.id, item.name, startDate, endDate, progress, item.id);
      synced++;
    }

    res.json({ success: true, synced });
  } catch (err) {
    console.error('Monday sync failed:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:id/chat', async (req, res) => {
  try {
    const answer = await askQuestion(req.params.id, req.body.question);
    res.json({ answer });
  } catch (e) { res.status(500).json({ error: 'AI error' }); }
});

app.get('/api/analytics/global', (req, res) => {
  try {
    const data = db.prepare(`
      SELECT 
        (SELECT IFNULL(SUM(total_amount), 0) FROM budgets) as totalBudget,
        (SELECT IFNULL(SUM(amount), 0) FROM expenses) as totalExpenses,
        (SELECT IFNULL(SUM(amount), 0) FROM incomes) as totalIncomes,
        (SELECT COUNT(*) FROM projects) as totalProjects,
        (SELECT COUNT(*) FROM projects WHERE status = 'תקין') as activeProjects,
        (SELECT COUNT(*) FROM tenders WHERE status != 'נותח') as openTenders,
        0 as openWarrantyTickets
    `).get();
    res.json({
      ...data,
      openWarrantyTickets: data.openWarrantyTickets || 0
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch global analytics' });
  }
});

// Wildcard routing for SPA
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: `API route not found: ${req.path}` });
  }
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend build not found.');
  }
});

// Global API error handler
app.use((err, req, res, next) => {
  console.error('Unhandled API Error:', err);
  if (req.path.startsWith('/api')) {
    return res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
  res.status(500).send('Internal Server Error');
});

// גיבוי אוטומטי לענן כל 5 דקות
setInterval(() => {
  console.log('☁️ Triggering background cloud backup...');
  db.backupToCloud();
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
// Triggering automated deployment pipeline check
// Re-triggering pipeline with correct secret name
// Triggering deployment after fixing IAM permissions

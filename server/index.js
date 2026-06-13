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
    db.prepare('UPDATE tenders SET proposal = ?, boq_json = ?, status = ? WHERE id = ?').run(proposal, boq_json, nextStatus, req.params.id);
    
    // Also save the proposal in the converted project if it exists!
    db.prepare('UPDATE projects SET proposal = ?, boq_json = ? WHERE tender_id = ?').run(proposal, boq_json, req.params.id);
    
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

// --- Other Financial Entities ---
app.get('/api/expenses', (req, res) => {
  const expenses = db.prepare('SELECT * FROM expenses').all();
  res.json(expenses);
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

app.post('/api/contractors', (req, res) => {
  const { name, specialization, phone, email } = req.body;
  const insert = db.prepare('INSERT INTO contractors (name, specialization, phone, email) VALUES (?, ?, ?, ?)');
  const info = insert.run(name, specialization, phone, email);
  res.status(201).json({ id: info.lastInsertRowid });
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

app.delete('/api/:resourceType/:id', (req, res) => {
  const { resourceType, id } = req.params;
  const pid = Number(id);
  const allowedTables = ['projects', 'expenses', 'incomes', 'budgets', 'orders', 'contractors', 'tenders'];
  if (allowedTables.includes(resourceType)) {
    db.prepare(`DELETE FROM ${resourceType} WHERE id = ?`).run(pid);
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Invalid resource type' });
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

// ===== Tasks API (Gantt) =====
app.get('/api/projects/:id/tasks', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY start_date ASC').all(req.params.id);
  res.json(tasks);
});

app.post('/api/projects/:id/tasks', (req, res) => {
  const { name, start_date, end_date, progress } = req.body;
  const stmt = db.prepare('INSERT INTO tasks (project_id, name, start_date, end_date, progress) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(req.params.id, name, start_date, end_date, progress || 0);
  res.json({ id: result.lastInsertRowid });
});

app.put('/api/tasks/:id', (req, res) => {
  const { name, start_date, end_date, progress } = req.body;
  db.prepare('UPDATE tasks SET name = ?, start_date = ?, end_date = ?, progress = ? WHERE id = ?')
    .run(name, start_date, end_date, progress || 0, req.params.id);
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== Monday.com Sync =====
app.post('/api/projects/:id/sync-monday', async (req, res) => {
  const { token, boardId } = req.body;
  if (!token || !boardId) return res.status(400).json({ error: 'Missing token or boardId' });

  try {
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

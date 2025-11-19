// server.js
// Backend for After-School Classes coursework
// - Node.js + Express
// - native MongoDB driver (no mongoose)
// - Database: AFTER_SCHOOL_LESSONS
// - Collections: Lessons, Orders
// - Routes: GET /lessons, GET /search, POST /orders, PUT /lessons/:id
// - Logging middleware, static files middleware, static images route with 404 handling
// - No extra, no student ID in paths. Strictly coursework-compliant.

require('dotenv').config(); // <---- Load .env variables

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

const app = express();
//const PORT = process.env.PORT || 8080;

// ===== Middleware =====
app.use(cors());
app.use(bodyParser.json());

// Logger middleware (required)
app.use((req, res, next) => {
  // log method, url, and body for inspectability
    console.log(
    new Date().toISOString(),
    req.method,
    req.originalUrl,
    req.body && Object.keys(req.body).length ? req.body : ''
  );
  next();
});

// Serve frontend static files from ./public
app.use(express.static(path.join(__dirname, 'public')));

// Static images endpoint that returns 404 JSON if not present (coursework requirement)
app.get('/images/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public', 'images', filename);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }
    res.sendFile(filePath);
  });
});

// ===== MongoDB connection setup =====
// =====Use your Atlas connection string here=====
//const MONGO_URI = 'mongodb+srv://MICHAEL:1Q2W3E@cluster0.0jkcsmn.mongodb.net/';
//const DB_NAME = 'AFTER_SCHOOL_LESSONS';

const MONGO_URI = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

const DB_NAME = process.env.DB_NAME;

const client = new MongoClient(MONGO_URI, {
  
});

let db, Lessons, Orders;

async function startDb() {
  await client.connect();
  db = client.db(DB_NAME);
  Lessons = db.collection('Lessons');
  Orders = db.collection('Orders');
  console.log(`Connected to MongoDB Atlas database "${DB_NAME}"`);
}
startDb().catch(err => {
  console.error('Failed to connect to MongoDB Atlas:', err);
  process.exit(1);
});

// ===== ROUTES (COURSEWORK SPEC) =====

// GET /lessons - return all lessons as JSON
app.get('/lessons', async (req, res) => {
  try {
    const docs = await Lessons.find().toArray();
    res.json(docs);
  } catch (err) {
    console.error('GET /lessons error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /search?q=... - full-text like search across subject, location, price, spaces
// Coursework requires /search GET route that returns filtered results
app.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      // empty query -> return all lessons (frontend expects this behavior)
      const all = await Lessons.find().toArray();
      res.json(all);
      return;
    }

    const regex = new RegExp(q, 'i');

    // price and spaces are numbers - we'll compare both as number equality if q is numeric,
    // and also allow regex matching against subject/location strings.
    const numeric = !isNaN(Number(q)) ? Number(q) : null;

    const query = {
      $or: [
        { subject: regex },
        { location: regex },
        { icon: regex }
      ]
    };

    if (numeric !== null) {
      // match price OR spaces numerically as well
      query.$or.push({ price: numeric }, { spaces: numeric });
    }

    const results = await Lessons.find(query).toArray();
    res.json(results);
  } catch (err) {
    console.error('GET /search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /orders - save new order to Orders collection
// Body expected (coursework): { name, phone, lessonIDs, numberOfSpace }
// Note: lessonIDs should be an array of objects: [{ lessonId: <id>, qty: <number> }, ...]
app.post('/orders', async (req, res) => {
  try {
    const payload = req.body;

    // Basic validations required by coursework (name and phone checks are in front-end,
    // but backend should also validate presence)
    if (!payload || !payload.name || !payload.phone || !Array.isArray(payload.lessonIDs) || typeof payload.numberOfSpace !== 'number') {
      res.status(400).json({ error: 'Invalid order payload' });
      return;
    }

    // Insert order into Orders collection
    const insertResult = await Orders.insertOne({
      name: payload.name,
      phone: payload.phone,
      lessonIDs: payload.lessonIDs,
      numberOfSpace: payload.numberOfSpace
      // intentionally NOT adding timestamp to strictly follow coursework (you asked no extras)
    });

    // Update Lessons spaces for each lessonId by decrementing by qty.
    // Assumes lessonIDs elements: { lessonId: <id or _id string or numeric id>, qty: <number> }
    const updatePromises = payload.lessonIDs.map(async (entry) => {
      // We support both numeric id field (e.g., id: 1) and MongoDB _id string.
      let filter;
      if (entry.lessonId && ObjectId.isValid(String(entry.lessonId))) {
        // maybe the frontend uses ObjectId strings (if you exported data with _id)
        filter = { _id: new ObjectId(String(entry.lessonId)) };
      } else if (typeof entry.lessonId === 'number') {
        filter = { id: entry.lessonId };
      } else {
        // fallback try matching by id as string/number
        filter = { id: isNaN(Number(entry.lessonId)) ? entry.lessonId : Number(entry.lessonId) };
      }

      const qty = Number(entry.qty) || 0;
      if (qty > 0) {
        // decrement spaces by qty (can go negative if data inconsistent; front-end should prevent)
        return Lessons.updateOne(filter, { $inc: { spaces: -qty } });
      } else {
        return Promise.resolve();
      }
    });

    await Promise.all(updatePromises);

    res.status(201).json({ message: 'Order saved', orderId: insertResult.insertedId });
  } catch (err) {
    console.error('POST /orders error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /lessons/:id - update any attribute of a lesson (coursework requirement)
// Accepts either numeric id via `id` field or MongoDB _id string.
// Body can include any lesson fields (subject, location, price, spaces, icon)
app.put('/lessons/:id', async (req, res) => {
  try {
    const param = req.params.id;
    const updateBody = req.body;

    let filter;
    if (ObjectId.isValid(param)) {
      // treat as ObjectId
      filter = { _id: new ObjectId(param) };
    } else if (!isNaN(Number(param))) {
      // numeric id field
      filter = { id: Number(param) };
    } else {
      filter = { id: param };
    }

    // set only provided fields (do not upsert)
    const setBody = {};
    const allowed = ['subject', 'location', 'price', 'spaces', 'icon', 'id'];
    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(updateBody, k)) {
        setBody[k] = updateBody[k];
      }
    }

    if (Object.keys(setBody).length === 0) {
      res.status(400).json({ error: 'No updatable fields provided' });
      return;
    }

    const result = await Lessons.updateOne(filter, { $set: setBody });
    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Lesson not found' });
      return;
    }

    res.json({ message: 'Lesson updated' });
  } catch (err) {
    console.error('PUT /lessons/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 404 for API unknown routes (keep it explicit)
app.use((req, res) => {
  res.status(404).json({ error: 'Resource not found' });
});

// Global error handler (fallback)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
//app.listen(PORT, () => {
 // console.log(`Express server listening on http://localhost:${PORT}`);});
const port = process.env.PORT|| 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
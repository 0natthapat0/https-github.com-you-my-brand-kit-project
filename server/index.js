// REST + WebSocket backend so multiple people viewing the Coverages mockup can
// see comments appear for each other in real time. Comments are persisted in
// Postgres (see render.yaml) so they survive backend restarts/redeploys —
// swap this out for a real backend later if needed, the Angular app only
// talks to the /api/comments REST endpoint and the WebSocket.

const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { Pool } = require('pg');

const PORT = process.env.PORT || 4310;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      author TEXT,
      avatar_initials TEXT,
      timestamp TEXT,
      text TEXT,
      x DOUBLE PRECISION,
      y DOUBLE PRECISION,
      pin_number INTEGER,
      tab TEXT,
      resolved BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
}

function rowToComment(row) {
  return {
    id: String(row.id),
    author: row.author,
    avatarInitials: row.avatar_initials,
    timestamp: row.timestamp,
    text: row.text,
    x: row.x,
    y: row.y,
    pinNumber: row.pin_number,
    tab: row.tab,
    resolved: row.resolved,
  };
}

app.get('/api/comments', async (_req, res) => {
  const { rows } = await pool.query('SELECT * FROM comments ORDER BY id ASC');
  res.json(rows.map(rowToComment));
});

app.post('/api/comments', async (req, res) => {
  const b = req.body;
  const { rows } = await pool.query(
    `INSERT INTO comments (author, avatar_initials, timestamp, text, x, y, pin_number, tab, resolved)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [b.author, b.avatarInitials, b.timestamp, b.text, b.x ?? null, b.y ?? null, b.pinNumber ?? null, b.tab ?? null, b.resolved ?? false]
  );
  const comment = rowToComment(rows[0]);
  broadcast({ type: 'comment:new', comment });
  res.status(201).json(comment);
});

app.patch('/api/comments/:id', async (req, res) => {
  const existing = await pool.query('SELECT * FROM comments WHERE id = $1', [req.params.id]);
  if (existing.rows.length === 0) return res.status(404).end();
  const merged = { ...rowToComment(existing.rows[0]), ...req.body };
  const { rows } = await pool.query(
    `UPDATE comments SET author=$1, avatar_initials=$2, timestamp=$3, text=$4, x=$5, y=$6, pin_number=$7, tab=$8, resolved=$9
     WHERE id=$10 RETURNING *`,
    [merged.author, merged.avatarInitials, merged.timestamp, merged.text, merged.x, merged.y, merged.pinNumber, merged.tab, merged.resolved, req.params.id]
  );
  const comment = rowToComment(rows[0]);
  broadcast({ type: 'comment:update', comment });
  res.json(comment);
});

app.delete('/api/comments/:id', async (req, res) => {
  const result = await pool.query('DELETE FROM comments WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) return res.status(404).end();
  broadcast({ type: 'comment:delete', id: req.params.id });
  res.status(204).end();
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(payload);
  });
}

initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Comments server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database', err);
    process.exit(1);
  });

// Minimal in-memory REST + WebSocket backend so multiple people viewing the
// Coverages mockup can see comments appear for each other in real time.
// Swap this out for a real backend later — the Angular app only talks to
// the /api/comments REST endpoint and the WebSocket, so nothing else needs
// to change on the frontend if you replace this with your own service.

const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 4310;

const app = express();
app.use(cors());
app.use(express.json());

/** @type {Array<Record<string, unknown>>} */
let comments = [];
let nextId = 1;

app.get('/api/comments', (_req, res) => {
  res.json(comments);
});

app.post('/api/comments', (req, res) => {
  const comment = {
    ...req.body,
    id: 'c' + nextId++,
  };
  comments.push(comment);
  broadcast({ type: 'comment:new', comment });
  res.status(201).json(comment);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(message) {
  const payload = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) client.send(payload);
  });
}

server.listen(PORT, () => {
  console.log(`Comments server listening on http://localhost:${PORT}`);
});

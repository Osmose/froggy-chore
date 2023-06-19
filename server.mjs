/* eslint-env node */
import express from 'express';
import bodyParser from 'body-parser';
import sqlite3 from 'sqlite3';
import * as sqlite from 'sqlite';
import ViteExpress from 'vite-express';

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Initialize the database.
const db = await sqlite.open({
  filename: './.data/sqlite.db',
  driver: sqlite3.Database,
});
await db.migrate();

// GET /api/list/:listId
app.get('/api/list/:listId', async (request, response) => {
  const listId = request.params.listId;
  const list = await db.get('SELECT * FROM lists WHERE listId = $listId', { $listId: listId });
  if (!list) {
    response.sendStatus(404);
  } else {
    response.type('application/json').send({ list: JSON.parse(list.json), version: list.version });
  }
});

// POST /api/list/:listId
app.post('/api/list/:listId', async (request, response) => {
  const listId = request.params.listId;
  const { list, version } = request.body;
  await db.run(
    `INSERT INTO
      lists (listId, json)
    VALUES ($listId, $json)
    ON CONFLICT(listId) DO UPDATE
      SET json = $json, version = version + 1
      WHERE version = $version
    `,
    { $listId: listId, $json: JSON.stringify(list), $version: version }
  );

  const { changes } = await db.run('SELECT changes()');
  if (changes < 1) {
    response.sendStatus(409);
    return;
  }

  response.type('application/json').send({ newVersion: version + 1 });
});

const listener = ViteExpress.listen(app, process.env.PORT || 8000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

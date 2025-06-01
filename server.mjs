/* eslint-env node */
import { sql } from 'bun';
import { Database } from 'bun:sqlite';
import express from 'express';
import bodyParser from 'body-parser';
import ViteExpress from 'vite-express';

const sqliteDriver = {
  db: null,
  getListQuery: null,
  upsertListQuery: null,

  async init() {
    this.db = new Database('./sqlite.db', { create: true, strict: true });
    this.db
      .query(
        `
          CREATE TABLE IF NOT EXISTS lists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            listId VARCHAR(255) NOT NULL UNIQUE,
            json TEXT NOT NULL,
            version INTEGER NOT NULL DEFAULT 0
          );
        `
      )
      .run();

    this.getListQuery = this.db.query('SELECT * FROM lists WHERE listId = $listId');
    this.upsertListQuery = this.db.query(`
      INSERT INTO
        lists (listId, json)
      VALUES ($listId, $json)
      ON CONFLICT(listId) DO UPDATE
        SET json = $json, version = version + 1
        WHERE version = $version
    `);
  },

  async getList(listId) {
    return this.getListQuery.get({ listId });
  },

  async upsertList({ listId, json, version }) {
    return this.upsertListQuery.run({ listId, json, version }).changes;
  },
};

const postgresDriver = {
  db: null,
  getListQuery: null,
  upsertListQuery: null,

  async init() {
    await sql(`
      CREATE TABLE IF NOT EXISTS lists (
        id SERIAL PRIMARY KEY,
        listId VARCHAR(255) NOT NULL UNIQUE,
        json TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 0
      );
    `);
  },

  async getList(listId) {
    return sql`SELECT * FROM lists WHERE listId = ${listId}`[0];
  },

  async upsertList({ listId, json, version }) {
    return sql`
      INSERT INTO
        lists (listId, json)
      VALUES (${listId}, ${json})
      ON CONFLICT(listId) DO UPDATE
        SET json = ${json}, version = version + 1
        WHERE version = ${version}
      RETURNING *
    `.length;
  },
};

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Initialize the database.
const dbDriver = process.env.DB_TYPE === 'postgres' ? postgresDriver : sqliteDriver;
await dbDriver.init();

// GET /api/list/:listId
app.get('/api/list/:listId', async (request, response) => {
  const listId = request.params.listId;
  const list = await dbDriver.getList(listId);
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
  const changes = await dbDriver.upsertList({ listId: listId, json: JSON.stringify(list), version: version });
  if (changes < 1) {
    response.sendStatus(409);
    return;
  }

  response.type('application/json').send({ newVersion: version + 1 });
});

const listener = ViteExpress.listen(app, process.env.PORT || 8000, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

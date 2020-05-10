const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// Initialize the database.
const dbFile = "./.data/sqlite.db";
const exists = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile);

// Create tables if the database doesn't exist.
db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE lists (id INTEGER PRIMARY KEY AUTOINCREMENT, listId VARCHAR(255) NOT NULL UNIQUE, json TEXT NOT NULL)"
    );
    console.log("New table lists created!");
  } else {
    console.log("Database ready to go!");
  }
});

// GET /
app.get("/", (request, response) => {
  response.sendFile(`${__dirname}/views/index.html`);
});

// GET /api/list/:listId
app.get("/api/list/:listId", (request, response) => {
  db.get(
    "SELECT * FROM lists WHERE listId = $listId",
    { $listId: request.params.listId },
    (err, list) => {
      if (err) {
        console.error(err);
        response.sendStatus(500);
      } else {
        response.send(list.json);
      }
    }
  );
});

// POST /api/list/:listId
app.post("/api/list/:listId", (request, response) => {
  const listId = request.params.listId;
  const json = request.body.json;
  db.run(
    `INSERT INTO lists (listId, json) VALUES ($listId, $json) ON CONFLICT(listId) UPDATE SET json = $json`,
    { $id: listId, $json: json },
    (request, error) => {
      if (error) {
        console.error(error);
        response.sendStatus(500);
      } else {
        response.send(json);
      }
    }
  );
});

const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

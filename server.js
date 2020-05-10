const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

// init sqlite db
const dbFile = "./.data/sqlite.db";
const exists = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile);

// Create tables if the database doesn't exist.
db.serialize(() => {
  if (!exists) {
    db.run(
      "CREATE TABLE lists (id INTEGER PRIMARY KEY AUTOINCREMENT, json TEXT)"
    );
    console.log("New table lists created!");
  } else {
    console.log("Database ready to go!");
  }
});

app.get("/", (request, response) => {
  response.sendFile(`${__dirname}/views/index.html`);
});

// GET /api/list/:
app.get("/api/list/${listId}", (request, response) => {
  db.get(
    "SELECT * FROM lists WHERE id = $id",
    { $id: request.params.listId },
    (err, list) => {
      if (err) {
        response.send(list.json);
      } else {
        response.sendStatus(500);
      }
    }
  );
});

// endpoint to add a dream to the database
app.post("/api/list/${listId}", (request, response) => {
  db.run(
    `INSERT INTO lists (id, json) VALUES ($id, $json) ON CONFLICT(id) UPDATE SET json = $json`,
    { $id: request.params.listId, $json: request.body.json },
    (request, error) => {
      if (error) {
        response.send({ message: "error!" });
      } else {
        response.send({ message: "success" });
      }
    }
  );
});

const listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

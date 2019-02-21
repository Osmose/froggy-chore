const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const RESTAURANTS = [
  {name: 'BJ\'s Brewhouse'},
  {name: 'Red Robin'},
  {name: 'IHOP'},
  {name: 'Old Spaghetti Factory'},
];

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

const dbFile = './.data/sqlite.db';
const exists  = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile);
db.serialize(function() {
  if (!exists) {
    db.run('CREATE TABLE restaurants (name VARCHAR(255))');
    
    // insert default dreams
    db.serialize(function() {
      db.run('INSERT INTO restaurants (name) VALUES ("Find and count some sheep"), ("Climb a really tall mountain"), ("Wash the dishes")');
    });
  }
});

app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// app.get('/getDreams', function(request, response) {
//   db.all('SELECT * from Dreams', function(err, rows) {
//     response.send(JSON.stringify(rows));
//   });
// });

// GET /restaurants/random
// Return 200 with body {"name": "IHOP"}

app.get('/restaurants/random', function(request, response) {
  const index = Math.floor(Math.random() * RESTAURANTS.length);
  response.send(RESTAURANTS[index]);
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

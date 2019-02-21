const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

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
      db.run('INSERT INTO restaurants (name) VALUES ("BK\'s Brewhouse"), ("Red Robin"), ("IHOP"), ("Old Spaghetti Factory")');
    });
  }
});

app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

app.get('/restaurants/random', function(request, response) {
  db.all('SELECT * FROM restaurants', (error, restaurants) => {
    const index = Math.floor(Math.random() * restaurants.length);
    response.send(restaurants[index]);
  });
});

// POST /restaurants HEADER(Authentication: password) BODY({name: 'Foobar baz'})

app.post('/restaurants/add', function(request, response) {
  const newRestaurant = "Wendy\'s"
  db.run('INSERT INTO restaurants (name) VALUES (?)', newRestaurant, error => {
    response.status(200).send
  });    
});
// Return 200 if inserted
// return 409 if restaurant with matching name already exists



// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

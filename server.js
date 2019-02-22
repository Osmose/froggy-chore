const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();

app.use(express.static('public'));
app.use(express.json());

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

app.get('/restaurants', function(request, response) {
  db.all('SELECT * FROM restaurants', (error, restaurants) => {
    response.send(restaurants);
  });
});

app.get('/restaurants/random', function(request, response) {
  db.all('SELECT * FROM restaurants', (error, restaurants) => {
    const index = Math.floor(Math.random() * restaurants.length);
    response.send(restaurants[index]);
  });
});

app.post('/restaurants/add', async function(request, response) {
  if (request.get('Authorization') !== process.env.PASSWORD) {
    response.status(401).send('Unauthorized');
    return;
  }
  
  const newRestaurantName = request.body.name;
  const exists = await new Promise(resolve => {
    db.get('SELECT COUNT(*) FROM restaurants WHERE name = (?)', newRestaurantName, (error, row) => {
      resolve(row['COUNT(*)'] > 0);    
    });  
  });
  
  if (exists) {
    response.status(409).send('Already exists');
    return;
  }
  
  db.run('INSERT INTO restaurants (name) VALUES (?)', newRestaurantName, error => {
    response.status(200).send('ok!')
  });    
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

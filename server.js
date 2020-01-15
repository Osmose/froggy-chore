const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// App-level middleware
app.use(express.static('public'));
app.use(express.json());

// Initialize the database connection
const dbFile = './.data/sqlite.db';
const exists  = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile);
db.serialize(function() {
  // If the database file didn't exist before we set up the connection, we need to
  // create the initial tables and data.
  if (!exists) {
    db.run('CREATE TABLE chores (name VARCHAR(255), delay INTEGER, lastDone INTEGER)');
  }
});

// == Middleware

/**
 * A view-specific middleware function that verifies the request's password.
 * Returns a 401 if the password is incorrect.
 */
function requirePassword(request, response, next) {
  if (request.get('Authorization') !== process.env.PASSWORD) {
    response.status(401).send('Unauthorized');
    return;
  }
  next();
}

// == Views

/**
 * Return the main page of the site
 */
app.get('/', function(request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

/**
 * Verify a password. This makes it super-easy to try and bruteforce the password,
 * although without rate limiting or other measures that's still trivial to do on other
 * password-protected views anyway. 
 */
app.get('/authenticate', requirePassword, function(request, response) {
  response.send({valid: true});
});

/**
 * Return a list of saved restaurants
 */
app.get('/restaurants', function(request, response) {
  db.all('SELECT * FROM restaurants', (error, restaurants) => {
    response.send(restaurants);
  });
});

/**
 * Add a new restaurant to the saved list. Return a 409 if a restaurant with the given
 * name already exists.
 */
app.post('/restaurants/add', requirePassword, async function(request, response) {
   
  const newRestaurantName = request.body.name;
  const exists = await new Promise(resolve => {
    db.get('SELECT COUNT(*) FROM restaurants WHERE name = (?)', newRestaurantName, (error, row) => {
      resolve(row['COUNT(*)'] > 0);    
    });  
  });
  
  if (exists) {
    response.status(409).send({reason: 'Already exists'});
    return;
  }
  
  db.run('INSERT INTO restaurants (name) VALUES (?)', newRestaurantName, error => {
    response.status(200).send({name: newRestaurantName});
  });    
});

/**
 * Delete a restaurant from the saved list
 */
app.post('/restaurants/delete', requirePassword, async function(request, response) {
  const deleteRestaurantName = request.body.name;
  
  db.run('DELETE FROM restaurants WHERE name = (?)', deleteRestaurantName, error => {
    response.status(200).send({name: deleteRestaurantName});
  }); 
});

// == App start

const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

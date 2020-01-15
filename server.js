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
    db.run('CREATE TABLE chores (name VARCHAR(255) PRIMARY KEY, delay INTEGER NOT NULL, lastDone INTEGER)');
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
 * Return a list of saved chores
 */
app.get('/chores', function(request, response) {
  db.all('SELECT * FROM chores', (error, chores) => {
    response.send(chores);
  });
});

/**
 * Add a new chore to the saved list. Return a 409 if a chore with the given
 * name already exists.
 */
app.put('/chores', requirePassword, async function(request, response) {
  const newChoreName = request.body.name;
  const exists = await new Promise(resolve => {
    db.get('SELECT COUNT(*) FROM chores WHERE name = (?)', newChoreName, (error, row) => {
      resolve(row['COUNT(*)'] > 0);    
    });  
  });
  
  if (exists) {
    response.status(409).send({reason: 'Already exists'});
    return;
  }
  
  const newChoreDelay = request.body.delay;
  db.run('INSERT INTO chores (name, delay) VALUES (?, ?)', newChoreName, newChoreDelay, error => {
    response.status(200).send({name: newChoreName, delay: newChoreDelay});
  });    
});

/**
 * Delete a chore from the saved list
 */
app.delete('/chores', requirePassword, async function(request, response) {
  const deleteChoreName = request.body.name;
  
  db.run('DELETE FROM chores WHERE name = (?)', deleteChoreName, error => {
    response.status(200).send({id: deleteChoreName});
  }); 
});

// == App start

const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

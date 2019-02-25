/**
 * Manage interaction with the backend API.
 */
class API {
  constructor(password) {
    this.password = password
  }
  
  async fetch(path, options={}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        Authorization: this.password,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    return response.json();
  }
  
  async getRestaurants() {
    return this.fetch('/restaurants');
  }
    
  async addRestaurant(name) {
    return this.fetch('/restaurants/add', {
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
      }),
    });
  }
}

/**
 * Wait a given amount of milliseconds
 */
async function wait(delay) {
  return new Promise(resolve => {
    window.setTimeout(resolve, delay);
  });
}

/**
 * Pick a random item from a list
 */
function randomChoice(choices) {
  return choices[Math.floor(Math.random() * choices.length)];
}

let api = new API();
const dom = {
  choiceSound: document.querySelector('#choice-sound'),
  chooseButton: document.querySelector('#choose-button'),
  restaurantList: document.querySelector('#restaurant-list'),
};

// When the choose button is clicked, get a random restaurant from the server
// and show a short animation before highlighting it.
dom.chooseButton.addEventListener('click', async () => {
  for (const li of dom.restaurantList.children) {
    li.classList.remove('selected'); 
  }
  
  dom.choiceSound.play();
  
  let lastListItem = null;
  for (let k = 0; k < 20; k++) {
    if (lastListItem) {
      lastListItem.classList.remove('selected');
    }
    
    const listItem = randomChoice(dom.restaurantList.children);
    listItem.classList.add('selected');
    lastListItem = listItem;
    await wait(120);
  }
});

(async function() {
  // Build the restaurant list
  for (const restaurant of await api.getRestaurants()) {
    const listItem = document.createElement('li');
    listItem.textContent = restaurant.name; 
    dom.restaurantList.appendChild(listItem);
  }
  
  // If a password has been saved, hide the password form, otherwise set it as the API password
//   const password = localStorage.getItem('password');
//   if (password && await api.verifyPassword(password)) {
    
//   }
})();
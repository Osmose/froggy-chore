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

async function wait(delay) {
  return new Promise(resolve => {
    window.setTimeout(resolve, delay);
  });
}

function randomChoice(choices) {
  return choices[Math.floor(Math.random() * choices.length)];
}

let api = new API();
const dom = {
  chooseButton: document.querySelector('#choose-button'),
  restaurantList: document.querySelector('#restaurant-list'),
};

// When the choose button is clicked, get a random restaurant from the server
// and show a short animation before highlighting it.
dom.chooseButton.addEventListener('click', async () => {
  for (const li of dom.restaurantList.children) {
    li.classList.remove('selected'); 
  }
  
  let lastLi = null;
  for (let k = 0; k < 16; k++) {
    if (lastLi) {
      lastLi.classList.remove('selected');
    }
    
    randomChoice(dom.
  }
  
  
  const restaurantLi = Array.from(dom.restaurantList.children).find(
    li => li.textContent === restaurant.name,
  );
  restaurantLi.classList.add('selected');
});

// On load, build the restaurant list
(async function() {
  for (const restaurant of await api.getRestaurants()) {
    const li = document.createElement('li');
    li.textContent = restaurant.name; 
    dom.restaurantList.appendChild(li);
  }
})();
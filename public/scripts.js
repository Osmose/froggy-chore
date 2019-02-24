// async function randomRestaurantName() {
//   const response = await fetch('/restaurants/random');
//   const restaurant = await response.json();
//   return restaurant.name;
// }

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
  
  async getRandomRestaurant() {
    return this.fetch('/restaurants/random');
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

let api = new API();
const dom = {
  chooseButton: document.querySelector('#choose-button'),
  restaurantList: document.querySelector('#restaurant-list'),
};

// When the choose button is clicked, get a random restaurant from the server
// and show a short animation before highlighting it.
dom.chooseButton.addEventListener('click', async () => {
  const restaurant = await api.getRandomRestaurant();
  
  for (const li of dom.restaurantList.children) {
    li.classList.remove('selected'); 
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
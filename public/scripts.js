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
    const response = fetch(path, {
      headers: {
        'Authoriz
        ...options.headers,
      },
      ...options,
    });
  }
  
  async getRestaurants() {
    return this.fetch('/restaurants');
  }
}

async function getRestaurants(){
  const response = await fetch('/restaurants');
  return response.json(); 
} 

// document.querySelector('#new-restaurant').addEventListener('submit', async function(event) {
//   event.preventDefault();
  
//   const formData = new FormData(this);
//   const newRestaurant = {
//     name: formData.get('name'),
//   };
  
//   const response = await fetch('/restaurants/add', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       'Authorization': formData.get('password'),
//     },
//     body: JSON.stringify(newRestaurant),
//   });
//   if (!response.ok) {
//     window.alert(await response.text());
//   } else {
//     window.alert(`${newRestaurant.name} added!`);
//   }
//   buildRestaurantList();
// });

// On load, build the restaurant list
(async function() {
  const api = new API();
  const restaurantList = document.querySelector('#restaurant-list');
  for (const restaurant of await api.getRestaurants()) {
    const li = document.createElement('li');
    li.textContent = restaurant.name; 
    restaurantList.appendChild(li);
  }
})();
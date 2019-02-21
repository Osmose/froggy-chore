const restaurants = [
  'BJ\'s Brewhouse',
  'Red Robin',
  'IHOP',
  'Old Spaghetti Factory',
];

function pickplace(){
  console.log();
  // 1. pick random restaurnt from list
  const restaurantName = randomRestaurant();
  // 2. get handle to h1
  const header = document.querySelector('#title');
  // 3. set innerText of h1 to restaurnat
}

function randomRestaurant(){
  const index = Math.floor(Math.random() * restaurants.length);
  return restaurants[index];
}

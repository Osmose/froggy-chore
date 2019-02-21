const restaurants = [
  'BJ\'s Brewhouse',
  'Red Robin',
  'IHOP',
  'Old Spaghetti Factory',
];

function randomRestaurant(){
  const index = Math.floor(Math.random() * restaurants.length);
  return restaurants[index];
}

document.querySelector('#choose-button').addEventListener('click', event => {
  if (event.target.matches('#model > *')) {
    do nothi
  document.querySelector('#title').innerText = randomRestaurant();  
});
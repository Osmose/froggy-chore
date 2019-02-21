async function randomRestaurantName() {
  const response = await fetch('/restaurants/random');
  const restaurant = await response.json();
  return restaurant.name;
}

document.querySelector('#choose-button').addEventListener('click', async () => {
  document.querySelector('#title').innerText = await randomRestaurantName();  
});
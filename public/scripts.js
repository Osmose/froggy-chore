async function randomRestaurant() {
  // query api for random restaurant
  const response = await fetch('');
  
  // GET /restaurants/random == {name: 'IHOP'}
  const restaurant = null;
  // return name of restaurant returned from the server
}

document.querySelector('#choose-button').addEventListener('click', async () => {
  document.querySelector('#title').innerText = await randomRestaurant();  
});
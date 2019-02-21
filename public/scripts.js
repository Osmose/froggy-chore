async function randomRestaurant() {
  // query api for random restaurant
  
  // return name of restaurant returned from the server
}

document.querySelector('#choose-button').addEventListener('click', () => {
  document.querySelector('#title').innerText = randomRestaurant();  
});
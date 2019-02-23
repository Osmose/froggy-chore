async function randomRestaurantName() {
  const response = await fetch('/restaurants/random');
  const restaurant = await response.json();
  return restaurant.name;
}

async function getRestaurantList(){
  const response = await fetch('/restaurants');
  // Fun fact: Since async functions already return a promise, you don't need to await the last promise in them
  // The promise you return will automatically be the promise the function returns instead of the implicit one
  return await response.json(); 
} 

async function buildRestaurantList(){
  const list = await getRestaurantList();
  let buildList = [];
  list.forEach(function(item){
    buildList = buildList + ('<li>' + item.name + '</li>'); 
  })
  document.querySelector('#restaurant-list').innerHTML = buildList;
  
}

document.querySelector('#choose-button').addEventListener('click', async function() {
  document.querySelector('#title').innerText = await randomRestaurantName();  
});

document.querySelector('#new-restaurant').addEventListener('submit', async function(event) {
  event.preventDefault();
  
  const formData = new FormData(this);
  const newRestaurant = {
    name: formData.get('name'),
  };
  
  const response = await fetch('/restaurants/add', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': formData.get('password'),
    },
    body: JSON.stringify(newRestaurant),
  });
  if (!response.ok) {
    window.alert(await response.text());
  } else {
    window.alert(`${newRestaurant.name} added!`);
  }
});

document.addEventListener("DOMContentLoaded", async function() {
  await buildRestaurantList();
});
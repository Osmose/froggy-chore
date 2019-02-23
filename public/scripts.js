async function randomRestaurantName() {
  const response = await fetch('/restaurants/random');
  const restaurant = await response.json();
  return restaurant.name;
}

async function getRestaurantList(){
  const response = await fetch('/restaurants');
  const restaurantList = await response.json();
  console.log(restaurantList);
  // Osmose: What is this function returning?
  // sam: a list of 
} 

async function buildRestaurantList(){
  const list = await getRestaurantList();
  let buildList = []
  console.log(list); // Sam: this is undefind, it seems like it is because this line runs before list has been set. I thought that the rest of a function will continue to run even if there is a line that is being awaited?
  
  // Osmose: At this point `list` is a list of items, there's no more promises to await
  list.foreach(function(item){
    buildList.append('<li>' + item.name + '</li>'); 
    console.log(item.name);
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
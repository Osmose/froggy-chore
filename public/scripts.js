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
  const ul = document.querySelector('#restaurant-list');
  ul.innerHTML = ""; 
  list.forEach(function(item){ // for (const item of list) is my preferred format but it's purely a preference
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(item.name)); // li.textContent = item.name should work here as well
    li.setAttribute("class", "not-editable"); // Alternatives would be: `li.className = 'not-editable'` or `li.classList.add('not-editable')`.
    ul.appendChild(li);
  })  
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
  await buildRestaurantList();
});

// Could just pass `buildRestaurantList` as the callback instead of creating a new function, e.g. `document.addEventListener('DOMContentLoaded', buildRestaurantList)`
// The script tag in the page is also located after the HTML we depend on, so it's guaranteed to be parsed by the time this code runs, meaning we could also
// just call buildRestaurantList directly
document.addEventListener("DOMContentLoaded", async function() {
  await buildRestaurantList();
});

document.body.addEventListener('click', function(event) {
  if (document.querySelector('#restaurant-name').contains(event.target)){
    console.log("click");  
  }
});
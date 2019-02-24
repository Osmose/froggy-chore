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
    li.textContent = item.name; 
    li.className = 'not-editable';
    ul.appendChild(li);
  })  
}

function setEditability(ul){
  ul.forEach(function(li){
    if (li.className == 'editable'){
      li.className = 'not-editable';
    } else if (li.className == 'not-editable'){
      li.className = 'editable';
    }
  });
};

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

document.querySelector('#delete-button').addEventListener('click', function() {
   const button = document.querySelector('#delete-button')
   const editMode = button.getAttribute('edit-mode');
   if (editMode === 'false'){
     button.setAttribute('edit-mode', 'true');
     button.textContent = 'Stop Deleting Restaurants';
     setEditability(document.querySelector('#restaurant-list').childNodes);
   }
   else if (editMode === 'true'){
     button.setAttribute('edit-mode', 'false');
     button.textContent = 'Delete Restaurant(s)';
     setEditability(document.querySelector('#restaurant-list').childNodes);
   }
});

document.body.addEventListener('click', async function(event) {
  if (event.target.getAttribute('class') === "editable"){
    const deleteRestaurant = {
      name: event.target.textContent,
    }
    
    const response = await fetch('/restaurants/delete',{
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body:JSON.stringify(
    })
  }
})

buildRestaurantList();
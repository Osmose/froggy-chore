/**
 * Manage interaction with the backend API.
 */
class API {
  constructor(password) {
    this.password = password
  }
  
  async fetch(path, options={}) {
    const response = await fetch(path, {
      ...options,
      headers: {
        Authorization: this.password,
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    return response.json();
  }
  
  async getRestaurants() {
    return this.fetch('/restaurants');
  }
    
  async addRestaurant(name) {
    return this.fetch('/restaurants/add', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
      }),
    });
  }
  
  async deleteRestaurant(name) {
    return this.fetch('/restaurants/delete', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
      }),
    });
  }
  
  async verifyPassword(password) {
    const response = await fetch('/authenticate', {
      headers: {
        Authorization: password,
      },
    });
    return response.ok;
  }
}

/**
 * Wait a given amount of milliseconds
 */
async function wait(delay) {
  return new Promise(resolve => {
    window.setTimeout(resolve, delay);
  });
}

/**
 * Pick a random item from a list
 */
function randomChoice(choices) {
  return choices[Math.floor(Math.random() * choices.length)];
}

/**
 * Take a <template> tag and create a new DOM node using it as a, well, template.
 * While not quite their intended use, this helper assumes we use <slot> tags as
 * placeholders for values to format the template with. For example, given the
 * HTML:
 *
 *   <template id="example">
 *     <span><slot name="somevalue"></slot></span>
 *   </template>
 *
 * We can call this function:
 *
 *   renderTemplate(document.getElementById('example'), {somevalue: 'foobar'});
 *
 * Which will return a DOM node structured like this:
 *
 *   <span>foobar</span>
 */
function renderTemplate(templateNode, values) {
  const renderedDom = document.importNode(templateNode.content, true);
  for (const [key, value] of Object.entries(values)) {
    renderedDom.querySelector(`slot[name="${key}"]`).replaceWith(value);
  }
  return renderedDom;
}

let api = new API();
const dom = {
  body: document.body,
  choiceSound: document.querySelector('#choice-sound'),
  chooseButton: document.querySelector('#choose-button'),
  passwordForm: document.querySelector('#password-form'),
  restaurantList: document.querySelector('#restaurant-list'),
  restaurantListItemTemplate: document.querySelector('#restaurant-list-item'),
};

// When the choose button is clicked, get a random restaurant from the server
// and show a short animation before highlighting it.
dom.chooseButton.addEventListener('click', async () => {
  for (const li of dom.restaurantList.children) {
    li.classList.remove('selected'); 
  }
  
  dom.choiceSound.play();
  
  let lastListItem = null;
  for (let k = 0; k < 20; k++) {
    if (lastListItem) {
      lastListItem.classList.remove('selected');
    }
    
    const listItem = randomChoice(dom.restaurantList.children);
    listItem.classList.add('selected');
    lastListItem = listItem;
    await wait(120);
  }
});

// When the password form is submitted, verify the given password and save
// it if it's valid.
dom.passwordForm.addEventListener('submit', async event => {
  event.preventDefault();
  
  const password = new FormData(dom.passwordForm).get('password');
  if (await api.verifyPassword(password)) {
    localStorage.setItem('password', password);
    dom.body.classList.add('authenticated');
    api = new API(password);
    
    window.alert('Password accepted and saved');
  } else {
    window.alert('Password rejected');
  }
});

dom.restaurantList.addEventListener('click', async event => {
  if (!event.target.matches('.restaurant-list-item .delete')) {
    return;
  }
  
  event.stopPropagation();
  const listItem = event.target.closest('.restaurant-list-item');
  const name = listItem.querySelector('.name').textContent;
  await api.deleteRestaurant(name);
  listItem.remove();
});

(async function() {
  // If a password has been saved, hide the password form, otherwise set it as the API password
  const password = localStorage.getItem('password');
  if (password && await api.verifyPassword(password)) {
    dom.body.classList.add('authenticated');
    api = new API(password);
  } else {
    api = new API();
  }
  
  // Build the restaurant list
  for (const restaurant of await api.getRestaurants()) {
    const listItem = renderTemplate(dom.restaurantListItemTemplate, {
      name: restaurant.name,
    });
    dom.restaurantList.appendChild(listItem);
  }
})();
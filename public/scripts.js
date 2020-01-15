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
  
  async getChores() {
    return this.fetch('/chores');
  }
    
  async addChore(name, delay) {
    return this.fetch('/chores', {
      method: 'put',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        delay,
      }),
    });
  }
  
  async deleteChore(name) {
    return this.fetch('/chores', {
      method: 'delete',
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
    const domNode = renderedDom.querySelector(`slot[name="${key}"]`);
    if (domNode).replaceWith(value);
  }
  return renderedDom;
}

let api = new API();
const dom = {
  body: document.body,
  newChoreForm: document.querySelector('#new-chore-form'),
  passwordForm: document.querySelector('#password-form'),
  choreList: document.querySelector('#chore-list'),
  choreListItemTemplate: document.querySelector('#chore-list-item'),
};

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

// When the new chore form is submitted, save the chore and
// add it to the list
dom.newChoreForm.addEventListener('submit', async event => {
  event.preventDefault();
  
  const formData = new FormData(dom.newChoreForm);
  const name = formData.get('name');
  const delay = formData.get('delay')
  try {
    await api.addChore(name, delay);
  } catch (err) {
    window.alert(`Failed to add chore: ${err}`);
    return;
  }
  
  const listItem = renderTemplate(dom.choreListItemTemplate, {name, delay});
  dom.choreList.appendChild(listItem);
  dom.newChoreForm.reset();
});

// When a delete button is clicked, delete the associated chore on the
// server and then remove it from the list.
dom.choreList.addEventListener('click', async event => {
  if (!event.target.matches('.chore-list-item .delete')) {
    return;
  }
  
  event.stopPropagation();
  const listItem = event.target.closest('.chore-list-item');
  const name = listItem.querySelector('.name').textContent;
  await api.deleteChore(name);
  listItem.remove();
});

// Kickoff! 
(async function() {
  // If a password has been saved, hide the password form, otherwise set it as the API password
  const password = localStorage.getItem('password');
  if (password && await api.verifyPassword(password)) {
    dom.body.classList.add('authenticated');
    api = new API(password);
  } else {
    api = new API();
  }
  
  // Build the chore list
  for (const chore of await api.getChores()) {
    const listItem = renderTemplate(dom.choreListItemTemplate, {
      name: chore.name,
      delay: chore.delay,
    });
    dom.choreList.appendChild(listItem);
  }
})();
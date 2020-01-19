const ADD_CHORE_QUOTES = [
  'A small price to pay for Froggy Chore',
  'KERO KERO',
  
];

const DO_CHORE_QUOTES = [
  'Awwwwwwwwwww yeahhhhhhhhhh',
];

const REMOVE_CHORE_QUOTES = [
  'Later gator',
];

class API {  
  constructor() {
    this.chores = [];
    try {
      this.chores = JSON.parse(localStorage.chores);
    } catch (err) { }
  }
  
  saveChores() {
    localStorage.chores = JSON.stringify(this.chores);
  }
  
  async getChores() {
    return this.chores;
  }
    
  async addChore(name, delay) {
    const chore = {name, delay, lastDone: null};
    this.chores.push(chore);
    this.saveChores();
    return chore;
  }
  
  async deleteChore(name) {
    this.chores = this.chores.filter(chore => chore.name !== name);
    this.saveChores();
  }
  
  async completeChore(name) {
    let completedChore;
    this.chores = this.chores.map(chore => {
      if (chore.name !== name) {
        return chore;
      }
      
      completedChore = {
        ...chore,
        lastDone: new Date(),
      };
      return completedChore;
    });
    this.saveChores();
    
    return completedChore;
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
    if (domNode) {
      domNode.replaceWith(value);
    }
  }
  return renderedDom;
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function choreStatus(chore) {
  const now = new Date();
  const choreLastDone = new Date(chore.lastDone);
  
  const diff = now - choreLastDone;
  const delayMs = chore.delay * 24 * 60 * 60 * 1000;
  if (diff >= delayMs) {
    return 'Due today';
  } else {
    const dayDiff = Math.ceil((delayMs - diff) / 24 / 60 / 60 / 1000);    
    return `Due in ${dayDiff} days`;
  }
}

let api = new API();
const dom = {
  body: document.body,
  newChoreForm: document.querySelector('#new-chore-form'),
  passwordForm: document.querySelector('#password-form'),
  choreList: document.querySelector('#chore-list'),
  choreListItemTemplate: document.querySelector('#chore-list-item-template'),
  frogSay: document.querySelector('#frog-say'),
};

function frogSay(text) {
  dom.frogSay.textContent = text;
}

// When the new chore form is submitted, save the chore and add it to the list
dom.newChoreForm.addEventListener('submit', async event => {
  event.preventDefault();
  
  const formData = new FormData(dom.newChoreForm);
  const name = formData.get('name');
  const delay = formData.get('delay')
  let chore;
  try {
    chore = await api.addChore(name, delay);
  } catch (err) {
    window.alert(`Failed to add chore: ${err}`);
    return;
  }
  
  const listItem = renderTemplate(dom.choreListItemTemplate, {
    name: chore.name,
    status: choreStatus(chore),
  });
  dom.choreList.appendChild(listItem);
  dom.newChoreForm.reset();
  
  frogSay(randomChoice(ADD_CHORE_QUOTES));
});

// When a delete button is clicked, delete the associated chore and then remove it from the list.
dom.choreList.addEventListener('click', async event => {
  if (!event.target.matches('.chore-list-item .delete')) {
    return;
  }
  
  event.stopPropagation();
  const listItem = event.target.closest('.chore-list-item');
  const name = listItem.querySelector('.name').textContent;
  await api.deleteChore(name);
  listItem.remove();
  
  frogSay(randomChoice(REMOVE_CHORE_QUOTES));
});

dom.choreList.addEventListener('click', async event => {
  if (!event.target.matches('.chore-list-item .complete')) {
    return;
  }
  
  event.stopPropagation();
  const listItem = event.target.closest('.chore-list-item');
  const name = listItem.querySelector('.name').textContent;
  const chore = await api.completeChore(name);

  const newListItem = renderTemplate(dom.choreListItemTemplate, {
    name: chore.name,
    status: choreStatus(chore),
  });
  listItem.parentNode.replaceChild(newListItem, listItem);
  
  frogSay(randomChoice(DO_CHORE_QUOTES));
});

// Kickoff! 
(async function() {
  // Build the chore list
  for (const chore of await api.getChores()) {
    const listItem = renderTemplate(dom.choreListItemTemplate, {
      name: chore.name,
      status: choreStatus(chore),
    });
    dom.choreList.appendChild(listItem);
  }
})();
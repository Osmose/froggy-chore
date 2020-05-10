/* global htmPreact */
const {
  html,
  render,
  createContext,
  useContext,
  useState,
  useEffect
} = htmPreact;

const ADD_CHORE_QUOTES = [
  "A small price to pay for Froggy Chore",
  "KERO KERO",
  "You’re gonna do great!",
  "Good luck!"
];

const DO_CHORE_QUOTES = [
  "Awwwwwwwwwww yeahhhhhhhhhh",
  "Nice job!",
  "お疲れ様です",
  "Job’s done.",
  "!!!"
];

const REMOVE_CHORE_QUOTES = [
  "Later gator",
  "Who even cared about that chore anyway, jeez",
  "YEET",
  "Get outta here"
];

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
    return "Due today";
  } else {
    const dayDiff = Math.ceil((delayMs - diff) / 24 / 60 / 60 / 1000);
    return `Due in ${dayDiff} days`;
  }
}

// let api = new API();
// const dom = {
//   body: document.body,
//   newChoreForm: document.querySelector('#new-chore-form'),
//   passwordForm: document.querySelector('#password-form'),
//   choreList: document.querySelector('#chore-list'),
//   choreListItemTemplate: document.querySelector('#chore-list-item-template'),
//   frogSay: document.querySelector('#frog-say'),
// };

// function frogSay(text) {
//   dom.frogSay.textContent = text;
// }

// // When the new chore form is submitted, save the chore and add it to the list
// dom.newChoreForm.addEventListener('submit', async event => {
//   event.preventDefault();

//   const formData = new FormData(dom.newChoreForm);
//   const name = formData.get('name');
//   const delay = formData.get('delay')
//   let chore;
//   try {
//     chore = await api.addChore(name, delay);
//   } catch (err) {
//     window.alert(`Failed to add chore: ${err}`);
//     return;
//   }

//   const listItem = renderTemplate(dom.choreListItemTemplate, {
//     name: chore.name,
//     status: choreStatus(chore),
//   });
//   dom.choreList.appendChild(listItem);
//   dom.newChoreForm.reset();

//   frogSay(randomChoice(ADD_CHORE_QUOTES));
// });

// // When a delete button is clicked, delete the associated chore and then remove it from the list.
// dom.choreList.addEventListener('click', async event => {
//   if (!event.target.matches('.chore-list-item .delete')) {
//     return;
//   }

//   event.stopPropagation();
//   const listItem = event.target.closest('.chore-list-item');
//   const name = listItem.querySelector('.name').textContent;
//   await api.deleteChore(name);
//   listItem.remove();

//   frogSay(randomChoice(REMOVE_CHORE_QUOTES));
// });

// dom.choreList.addEventListener('click', async event => {
//   if (!event.target.matches('.chore-list-item .complete')) {
//     return;
//   }

//   event.stopPropagation();
//   const listItem = event.target.closest('.chore-list-item');
//   const name = listItem.querySelector('.name').textContent;
//   const chore = await api.completeChore(name);

//   const newListItem = renderTemplate(dom.choreListItemTemplate, {
//     name: chore.name,
//     status: choreStatus(chore),
//   });
//   listItem.parentNode.replaceChild(newListItem, listItem);

//   frogSay(randomChoice(DO_CHORE_QUOTES));
// });

//       <h1>Froggy Chore</h1>
//       <ul id="chore-list">
//         <template id="chore-list-item-template">
//           <li class="chore-list-item">
//             <span class="name"><slot name="name"></slot></span>
//             <span class="status"><slot name="status"></slot></span>
//             <button class="complete" type="button">
//               DONE
//             </button>
//             <button class="delete" type="button">
//               X
//             </button>
//           </li>
//         </template>
//       </ul>

//       <form id="new-chore-form">
//         <input type="text" name="name" placeholder="Chore name" required>
//         <input type="number" name="delay" placeholder="Days until due again">
//         <button type="submit" class="add">
//           Add
//         </button>
//       </form>
//       <div class="box-border dialog-box">
//         <div class="portrait">
//           <img src="https://cdn.glitch.com/59c2bae2-f034-4836-ac6d-553a16963ad6%2Ffrog-portrait.png?v=1579411082193">
//         </div>
//         <div class="speech">
//           <p id="frog-say">
//             I can help you remember when to do your chores! <br><br>
//             Fill out the fields and click add to add a chore. Click DONE when you've performed the chore and I'll tell you how long until it's due again. Click the X to remove a chore.
//           </p>
//         </div>
//       </div>

class APIError extends Error {
  constructor(statusCode, ...args) {
    super(...args);
    this.statusCode = statusCode;
  }
}

const api = {
  async get(url) {
    const response = await fetch(url, { method: "GET" });
    if (response.ok) {
      return response.json();
    } else {
      throw new APIError(
        response.statusCode,
        `GET ${url} failed: ${response.statusCode} ${response.statusText}`
      );
    }
  },

  async post(url, params) {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(params),
      headers: { "Content-Type": "text/json" }
    });
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(
        response.statusCode,
        `POST ${url} failed: ${response.statusCode} ${response.statusText}`
      );
    }
  },
  
  async getList(listId) {
    return this.get(`/api/list/${listId}`);
  },
  
  async postList(listId, json) {
    return this.post(`/api/list/${listId}`, {json});
  }
};

const ChoreContext = createContext({});

function makeChores() {
  const [chores, setChores] = useState(undefined);
  const [listId, setListId] = useState(undefined);

  return {
    chores,
    
    async load(listId) {
      try {
        setChores(await api.get(listId));
        setListId(listId);
      } catch (err) {
        if (err.statusCode === 404) {
          setChores(null)
          setListId(null);
        }
      }
    },

    async create() {
      const listId = uuidv4();
      const json = JSON.stringify([]);
      await api.postList(listId, json);
      setChores([]);
      setListId(listId);
    },

    async add(name, delay) {
      const chore = {name, delay, lastDone: null};
      
      // I know, I'm risking a race condition here but I'm not getting paid for this
      const newChores = [...chores, chore];
      await api.postList(listId, JSON.stringify(newChores));
      setChores(newChores);
    },

    async delete(name) {
      const newChores = chores.filter(chore => chore.name !== name);
      await api.postList(listId, JSON.stringify(newChores));
      setChores(newChores);
    },

    async complete(name) {
      const newChores = chores.map(chore => {
        if (chore.name !== name) {
          return chore;
        }
        
        completedChore = {
          ...chore,
          lastDone: new Date(),
        };
        return completedChore;
      });
      await api.postList(listId, JSON.stringify(newChores));
      setChores(newChores);
    },
  };
}

function useChores() {
  return useContext(ChoreContext);
}

// I can help you remember when to do your chores! <br><br>
//           Fill out the fields and click add to add a chore. Click DONE when you've performed the chore and I'll tell you how long until it's due again. Click the X to remove a chore.

function DialogBox({ children }) {
  return html`
    <div class="box-border dialog-box">
      <div class="portrait">
        <img src="https://cdn.glitch.com/59c2bae2-f034-4836-ac6d-553a16963ad6%2Ffrog-portrait.png?v=1579411082193" />
      </div>
      <div class="speech">
        <p id="frog-say">
          ${children}       
        </p>
      </div>
    </div>
  `;
}

function Welcome() {
  const { create } = useChores();
  
  function handleClickCreate() {
    create();
  }

  return html`
    <button class="create-list" onClick=${handleClickCreate}>Create chore list</button>
    <${DialogBox}>
      I can help you remember when to do your chores!
      <br /><br />
      Click the button above to create a new list of chores.
    <//>
  `;
}

function ListView() {
  const { chores } = useChores();

  if (chores === undefined) {
    return html`<div>Loading...</div>`;
  } else if (chores === null) {
    return html`<
  }

  return html`
    <ul id="chore-list">
      <li class="chore-list-item">
        <span class="name"></span>
        <span class="status"></span>
        <button class="complete" type="button">
          DONE
        </button>
        <button class="delete" type="button">
          X
        </button>
      </li>
    </ul>
  `;
}

function App() {
  const url = new URL(window.location);
  const listId = url.searchParams.get("listId");
  const choreInteractor = makeChores();

  useEffect(() => {
    choreInteractor.load(listId);
  }, []);

  return html`
    <${ChoreContext.Provider} value=${choreInteractor}>
      <h1>Froggy Chore</h1>
      ${!listId ? html`
        <${Welcome} />
      ` : html`
        <${ListView} />
      `}
    <//>
  `;
}

// Kickoff!
render(
  html`
    <${App} />
  `,
  document.getElementById("container")
);

// (async function() {

//   // Build the chore list
//   for (const chore of await api.getChores()) {
//     const listItem = renderTemplate(dom.choreListItemTemplate, {
//       name: chore.name,
//       status: choreStatus(chore),
//     });
//     dom.choreList.appendChild(listItem);
//   }
// })();

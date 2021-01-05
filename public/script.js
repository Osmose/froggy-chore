/* global htmPreact uuidv4 */
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

const POSTPONE_CHORE_QUOTES = [
  'Mission failed, we\'ll get em next time',
  'Improvise. Adapt. Overcome.',
  'What do we say to the god of death?',
  'NANI?!'
];

const levelUpAudio = document.querySelector('#dqlevelup');
function playLevelUp() {
  levelUpAudio.play();
}

const innAudio = document.querySelector('#ff7inn');
function playInn() {
  innAudio.play();
}

const dutyCompleteAudio = document.querySelector('#dutycomplete');
function playDutyComplete() {
  dutyCompleteAudio.play();
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function choreTimeUntilDue(chore) {
  const now = new Date();
  const choreLastDone = new Date(chore.lastDone);

  const diff = now - choreLastDone;
  const delayMs = chore.delay * 24 * 60 * 60 * 1000;
  return delayMs - diff;
}

function choreDueDays(chore) {
  const now = new Date();
  const choreLastDone = new Date(chore.lastDone);
  choreLastDone.setHours(0, 0, 0, 0);

  const diff = now - choreLastDone;
  const delayMs = chore.delay * 24 * 60 * 60 * 1000;
  if (diff >= delayMs) {
    return 0;
  } else {
    return Math.ceil((delayMs - diff) / 24 / 60 / 60 / 1000);
  }
}

function choreDoneToday(chore) {
  const today = new Date();
  const choreLastDone = new Date(chore.lastDone);
  return choreLastDone.setHours(0,0,0,0) === today.setHours(0,0,0,0);
}

function choreStatus(chore) {    
  const dueDays = choreDueDays(chore);
  if (dueDays < 1) {
    return "Due today";
  } else {
    return `Due in ${dueDays} days`;
  }
}

class APIError extends Error {
  constructor(status, ...args) {
    super(...args);
    this.status = status;
  }
}

const api = {
  async get(url) {
    const response = await fetch(url, { method: "GET" });
    if (response.ok) {
      return response.json();
    } else {
      throw new APIError(
        response.status,
        `GET ${url} failed: ${response.status} ${response.statusText}`
      );
    }
  },

  async post(url, params) {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(params),
      headers: { "Content-Type": "application/json" }
    });
    if (response.ok) {
      return response.json();
    } else {
      throw new Error(
        response.status,
        `POST ${url} failed: ${response.status} ${response.statusText}`
      );
    }
  },
  
  async getList(listId) {
    return this.get(`/api/list/${listId}`);
  },
  
  async postList(listId, list) {
    return this.post(`/api/list/${listId}`, { json: JSON.stringify(list) });
  }
};

const ChoreContext = createContext({});

function makeChores() {
  const [chores, setChores] = useState(undefined);
  const [listId, setListId] = useState(undefined);
  const [created, setCreated] = useState(false);

  return {
    chores,
    created,
    
    async load(listId) {
      try {
        setChores(await api.getList(listId));
        setListId(listId);
        setCreated(false);
      } catch (err) {
        if (err.status === 404) {
          setChores(null)
          setListId(null);
        }
      }
    },

    async create() {
      const listId = uuidv4();
      const chores = [];
      await api.postList(listId, chores);
      setChores([]);
      setListId(listId);
      setCreated(true);
      history.pushState(null, '', `?listId=${listId}`);
    },

    async add(name, delay) {
      const chore = {name, delay, lastDone: null};
      
      // I know, I'm risking a race condition here but I'm not getting paid for this
      const newChores = [...chores, chore];
      await api.postList(listId, newChores);
      setChores(newChores);
    },

    async remove(name) {
      const newChores = chores.filter(chore => chore.name !== name);
      await api.postList(listId, newChores);
      setChores(newChores);
    },

    async complete(name) {
      const newChores = chores.map(chore => {
        if (chore.name !== name) {
          return chore;
        }
        
        return {
          ...chore,
          lastDone: new Date(),
        };
      });
      await api.postList(listId, newChores);
      setChores(newChores);
      
      const areChoresDue = newChores.some(chore => choreDueDays(chore) < 1)
      if (areChoresDue) {
        playLevelUp();
      } else {
        playDutyComplete();
      }
    },
    
    async postpone(name) {
      const newChores = chores.map(chore => {
        if (chore.name !== name) {
          return chore;
        }
        
        
        const dayMs = 24 * 60 * 60 * 1000;
        const timeUntilDue = choreTimeUntilDue(chore);
        let newLastDone = null;
        if (timeUntilDue < 0) {
          const now = new Date();
          const delayMs = chore.delay * dayMs;
          newLastDone = new Date(now.getTime() - delayMs + dayMs);
        } else {
          const oldLastDone = new Date(chore.lastDone);
          newLastDone = new Date(oldLastDone.getTime() + dayMs);
        }
        return {
          ...chore,
          lastDone: newLastDone,
        };
      });
      await api.postList(listId, newChores);
      setChores(newChores);
      playInn();
    }
  };
}

function useChores() {
  return useContext(ChoreContext);
}

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

function AddChoreForm() {
  const { add } = useChores();
  const [name, setName] = useState();
  const [delay, setDelay] = useState();

  async function handleSubmit(event) {
    event.preventDefault();

    await add(name, delay);
    setName('');
    setDelay('');
  }

  return html`
    <form id="new-chore-form" onSubmit=${handleSubmit}>
      <input 
        type="text" 
        name="name" 
        placeholder="Chore name" 
        required 
        value=${name} 
        onInput=${e => setName(e.target.value)}
      />
      <input 
        type="number" 
        name="delay" 
        placeholder="Days until due again"
        value=${delay}
        onInput=${e => setDelay(e.target.value)}
      />
      <button type="submit" class="add">
        Add
      </button>
    </form>
  `;
}

function ListView() {
  const { chores, complete, remove, created, postpone } = useChores();
  
  async function handleClickDone(chore) {
    await complete(chore.name);
  }

  async function handleClickDelete(chore) {
    await remove(chore.name);
  }
  
  async function handleClickPostpone(chore) {
    await postpone(chore.name);
  }

  if (chores === undefined) {
    return html`<div class="message">Loading...</div>`;
  } else if (chores === null) {
    return html`<div class="message">List not found.</div>`;
  }
  
  const sortedChores = [...chores];
  sortedChores.sort((a, b) => choreTimeUntilDue(a) - choreTimeUntilDue(b));
  
  const dueChores = sortedChores.filter(chore => choreDueDays(chore) < 1);
  const upcomingChores = sortedChores.filter(chore => choreDueDays(chore) >= 1);
  
  return html`
    ${created && html`
      <${DialogBox}>
        Bookmark this page! If you lose the URL you won't be able to get back to it! Anyone with the URL can view and edit it.
      <//>
    `}
    ${dueChores.length > 0 ? html`
      <h2>Due</h2>
      <ul class="chore-list">
        ${dueChores.map(chore => html`
          <${ChoreListItem} chore=${chore} onClickDone=${handleClickDone} onClickDelete=${handleClickDelete} onClickPostpone=${handleClickPostpone} />
        `)}
      </ul>
    ` : html`
      <${DialogBox}>You're all caught up, nice work! Time to relax.<//>
    `}
    ${upcomingChores.length > 0 && html`
      <h2>Upcoming</h2>
      <ul class="chore-list">
        ${upcomingChores.map(chore => html`
          <${ChoreListItem} chore=${chore} onClickDone=${handleClickDone} onClickDelete=${handleClickDelete} onClickPostpone=${handleClickPostpone} />
        `)}
      </ul>
    `}
    <${AddChoreForm} />
  `;
}

function ChoreListItem({ chore, onClickDone, onClickDelete, onClickPostpone }) {
  return html`
    <li class="chore-list-item" key=${chore.name}>
      <span class="name">
        ${choreDoneToday(chore) && html`
          <img src="https://cdn.glitch.com/59c2bae2-f034-4836-ac6d-553a16963ad6%2Ffroggy-favicon.png?v=1579413854880" class="done-today" />
        `}
        ${chore.name}
      </span>
      ${choreDueDays(chore) > 0 && html`
        <span class="status">${choreStatus(chore)}</span>
      `}
      <button class="complete" type="button" onClick=${() => onClickDone(chore)}>
        ✔
      </button>
      <button class="postpone" type="button" onClick=${() => onClickPostpone(chore)}>
        +
      </button>
      <button class="delete" type="button" onClick=${() => onClickDelete(chore)}>
        ✖
      </button>
    </li>
  `;
}

function App() {
  const url = new URL(window.location);
  const listId = url.searchParams.get("listId");
  const choreInteractor = makeChores();

  useEffect(() => {
    if (listId) {
      choreInteractor.load(listId);
    }
  }, []);

  return html`
    <${ChoreContext.Provider} value=${choreInteractor}>
      <h1 class="header">
        <img class="froggy-rotated" src="https://cdn.glitch.com/59c2bae2-f034-4836-ac6d-553a16963ad6%2Ffroggy-chore-rotated.png?v=1606669566496" />
        <a href="/">Froggy Chore</a>
      </h1>
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

window.api = api;
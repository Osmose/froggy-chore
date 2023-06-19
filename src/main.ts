import './styles.css';

import htm from 'htm';
import { h, render, createContext } from 'preact';
import { useContext, useState, useEffect } from 'preact/hooks';
import { v4 as uuidv4 } from 'uuid';

const html = htm.bind(h);

const levelUpAudio: HTMLAudioElement = document.querySelector('#dqlevelup')!;
function playLevelUp() {
  levelUpAudio.play();
}

const innAudio: HTMLAudioElement = document.querySelector('#ff7inn')!;
function playInn() {
  innAudio.play();
}

const dutyCompleteAudio: HTMLAudioElement = document.querySelector('#dutycomplete')!;
function playDutyComplete() {
  dutyCompleteAudio.play();
}

interface Chore {
  name: string;
  lastDone?: Date;
  delay: number;
}

function choreTimeUntilDue(chore: Chore) {
  if (!chore.lastDone) {
    return 0;
  }

  const now = new Date();
  const choreLastDone = new Date(chore.lastDone);

  const diff = now.getTime() - choreLastDone.getTime();
  const delayMs = chore.delay * 24 * 60 * 60 * 1000;
  return delayMs - diff;
}

function choreDueDays(chore: Chore) {
  if (!chore.lastDone) {
    return 0;
  }

  const now = new Date();
  const choreLastDone = new Date(chore.lastDone);
  choreLastDone.setHours(0, 0, 0, 0);

  const diff = now.getTime() - choreLastDone.getTime();
  const delayMs = chore.delay * 24 * 60 * 60 * 1000;
  if (diff >= delayMs) {
    return 0;
  } else {
    return Math.ceil((delayMs - diff) / 24 / 60 / 60 / 1000);
  }
}

function choreDoneToday(chore: Chore) {
  if (!chore.lastDone) {
    return false;
  }

  const today = new Date();
  const choreLastDone = new Date(chore.lastDone);
  return choreLastDone.setHours(0, 0, 0, 0) === today.setHours(0, 0, 0, 0);
}

function choreStatus(chore: Chore) {
  const dueDays = choreDueDays(chore);
  if (dueDays < 1) {
    return 'Due today';
  } else {
    return `Due in ${dueDays} days`;
  }
}

class APIError extends Error {
  status: number;

  constructor(status, ...args: any[]) {
    super(...args);
    this.status = status;
  }
}

const api = {
  async get(url: string) {
    const response = await fetch(url, { method: 'GET' });
    if (response.ok) {
      return response.json();
    } else {
      throw new APIError(response.status, `GET ${url} failed: ${response.status} ${response.statusText}`);
    }
  },

  async post(url: string, params: any) {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(params),
      headers: { 'Content-Type': 'application/json' },
    });
    if (response.ok) {
      return response.json();
    } else {
      throw new APIError(response.status, `POST ${url} failed: ${response.status} ${response.statusText}`);
    }
  },

  async getList(listId: string) {
    return this.get(`/api/list/${listId}`);
  },

  async postList(listId: string, list: Chore[], version: number) {
    try {
      return await this.post(`/api/list/${listId}`, { list, version });
    } catch (err) {
      if (err.status === 409) {
        window.alert('List has been changed, please refresh.');
      } else {
        window.alert('Unknown error while updating list.');
      }
    }
  },
};

interface ChoreInteractor {
  chores: Chore[] | null;
  created: boolean;

  load(listId: string): Promise<void>;
  create(): Promise<void>;
  add(name: string, delay: number): Promise<void>;
  remove(name: string): Promise<void>;
  complete(name: string): Promise<void>;
  postpone(name: string): Promise<void>;
}

class NullChoreInteractor implements ChoreInteractor {
  chores = [];
  created = false;

  async load() {}
  async create() {}
  async add() {}
  async remove() {}
  async complete() {}
  async postpone() {}
}

const ChoreContext = createContext<ChoreInteractor>(new NullChoreInteractor());

function makeChores(): ChoreInteractor {
  const [chores, setChores] = useState<Chore[] | null>(null);
  const [listId, setListId] = useState<string | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [created, setCreated] = useState<boolean>(false);

  return {
    chores,
    created,

    async load(listId) {
      try {
        const { list, version } = await api.getList(listId);
        setChores(list);
        setVersion(version ?? 0);
        setListId(listId);
        setCreated(false);
      } catch (err) {
        if (err.status === 404) {
          setChores(null);
          setListId(null);
          setVersion(null);
        }
      }
    },

    async create() {
      const listId = uuidv4();
      const chores = [];
      const newList = await api.postList(listId, chores, 0);
      setChores([]);
      setListId(listId);
      setVersion(newList.version);
      setCreated(true);
      history.pushState(null, '', `?listId=${listId}`);
    },

    async add(name, delay) {
      if (!listId || !chores || version === null) {
        throw new Error('Attempted to add a new chore before loading a list.');
      }

      const chore: Chore = { name, delay, lastDone: undefined };

      // I know, I'm risking a race condition here but I'm not getting paid for this
      const newChores = [...chores, chore];
      const { newVersion } = await api.postList(listId, newChores, version);
      setChores(newChores);
      setVersion(newVersion);
    },

    async remove(name) {
      if (!listId || !chores || version === null) {
        throw new Error('Attempted to remove a chore before loading a list.');
      }

      const newChores = chores.filter((chore) => chore.name !== name);
      const { newVersion } = await api.postList(listId, newChores, version);
      setChores(newChores);
      setVersion(newVersion);
    },

    async complete(name) {
      if (!listId || !chores || version === null) {
        throw new Error('Attempted to complete a chore before loading a list.');
      }

      const newChores = chores.map((chore) => {
        if (chore.name !== name) {
          return chore;
        }

        return {
          ...chore,
          lastDone: new Date(),
        };
      });
      const { newVersion } = await api.postList(listId, newChores, version);
      setChores(newChores);
      setVersion(newVersion);

      const areChoresDue = newChores.some((chore) => choreDueDays(chore) < 1);
      if (areChoresDue) {
        playLevelUp();
      } else {
        playDutyComplete();
      }
    },

    async postpone(name) {
      if (!listId || !chores || version === null) {
        throw new Error('Attempted to postpone a chore before loading a list.');
      }

      const newChores = chores.map((chore) => {
        if (chore.name !== name) {
          return chore;
        }

        const dayMs = 24 * 60 * 60 * 1000;
        const timeUntilDue = choreTimeUntilDue(chore);
        let newLastDone: Date;
        if (timeUntilDue <= 0) {
          const now = new Date();
          const delayMs = chore.delay * dayMs;
          newLastDone = new Date(now.getTime() - delayMs + dayMs);
        } else {
          const oldLastDone = new Date(chore.lastDone!);
          newLastDone = new Date(oldLastDone.getTime() + dayMs);
        }
        return {
          ...chore,
          lastDone: newLastDone,
        };
      });
      const { newVersion } = await api.postList(listId, newChores, version);
      setChores(newChores);
      setVersion(newVersion);
      playInn();
    },
  };
}

function useChores(): ChoreInteractor {
  return useContext(ChoreContext);
}

function DialogBox({ children }) {
  return html`
    <div class="box-border dialog-box">
      <div class="portrait">
        <img src="https://cdn.glitch.com/59c2bae2-f034-4836-ac6d-553a16963ad6%2Ffrog-portrait.png?v=1579411082193" />
      </div>
      <div class="speech">
        <p id="frog-say">${children}</p>
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
  const [name, setName] = useState('');
  const [delay, setDelay] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name || !delay) {
      return;
    }

    await add(name, Number.parseInt(delay));
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
        onInput=${(e) => setName(e.target.value)}
      />
      <input
        type="number"
        name="delay"
        placeholder="Days until due again"
        value=${delay}
        onInput=${(e) => setDelay(e.target.value)}
      />
      <button type="submit" class="add">Add</button>
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

  const dueChores = sortedChores.filter((chore) => choreDueDays(chore) < 1);
  const doneTodayChores = sortedChores.filter((chore) => choreDoneToday(chore));
  const upcomingChores = sortedChores.filter((chore) => !choreDoneToday(chore) && choreDueDays(chore) >= 1);

  return html`
    ${created &&
    html`
      <${DialogBox}>
        Bookmark this page! If you lose the URL you won't be able to get back to it! Anyone with the URL can view and
        edit it.
      <//>
    `}
    ${dueChores.length > 0
      ? html`
          <h2>Due</h2>
          <ul class="chore-list">
            ${dueChores.map(
              (chore) => html`
                <${ChoreListItem}
                  chore=${chore}
                  onClickDone=${handleClickDone}
                  onClickDelete=${handleClickDelete}
                  onClickPostpone=${handleClickPostpone}
                />
              `
            )}
          </ul>
        `
      : html` <${DialogBox}>You're all caught up, nice work! Time to relax.<//> `}
    ${doneTodayChores.length > 0 &&
    html`
      <h2>Completed</h2>
      <ul class="chore-list">
        ${doneTodayChores.map(
          (chore) => html`
            <${ChoreListItem}
              chore=${chore}
              onClickDelete=${handleClickDelete}
              onClickPostpone=${handleClickPostpone}
            />
          `
        )}
      </ul>
    `}
    ${upcomingChores.length > 0 &&
    html`
      <h2>Upcoming</h2>
      <ul class="chore-list">
        ${upcomingChores.map(
          (chore) => html`
            <${ChoreListItem}
              chore=${chore}
              onClickDone=${handleClickDone}
              onClickDelete=${handleClickDelete}
              onClickPostpone=${handleClickPostpone}
            />
          `
        )}
      </ul>
    `}
    <${AddChoreForm} />
  `;
}

function ChoreListItem({ chore, onClickDone, onClickDelete, onClickPostpone }) {
  return html`
    <li class="chore-list-item" key=${chore.name}>
      <span class="name">
        ${choreDoneToday(chore) &&
        html`
          <img
            src="https://cdn.glitch.com/59c2bae2-f034-4836-ac6d-553a16963ad6%2Ffroggy-favicon.png?v=1579413854880"
            class="done-today"
          />
        `}
        ${chore.name}
      </span>
      ${choreDueDays(chore) > 0 && html` <span class="status">${choreStatus(chore)}</span> `}
      ${onClickDone && html`<button class="complete" type="button" onClick=${() => onClickDone(chore)}>✔</button>`}
      ${onClickPostpone &&
      html`<button class="postpone" type="button" onClick=${() => onClickPostpone(chore)}>+</button>`}
      ${onClickDelete && html`<button class="delete" type="button" onClick=${() => onClickDelete(chore)}>✖</button>`}
    </li>
  `;
}

function App() {
  const url = new URL(window.location.href);
  const listId = url.searchParams.get('listId');
  const choreInteractor = makeChores();

  useEffect(() => {
    if (listId) {
      choreInteractor.load(listId);
    }
  }, []);

  return html`
    <${ChoreContext.Provider} value=${choreInteractor}>
      <h1 class="header">
        <img
          class="froggy-rotated"
          src="https://cdn.glitch.com/59c2bae2-f034-4836-ac6d-553a16963ad6%2Ffroggy-chore-rotated.png?v=1606669566496"
        />
        <a href="/">Froggy Chore</a>
      </h1>
      ${!listId ? html` <${Welcome} /> ` : html` <${ListView} /> `}
    <//>
  `;
}

// Kickoff!
render(html` <${App} /> `, document.getElementById('container')!);

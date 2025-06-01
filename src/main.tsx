import './styles.css';

import React from 'react';
import { createRoot } from 'react-dom/client';
import { v4 as uuidv4 } from 'uuid';

import frogPortraitUrl from './assets/frog-portrait.png';
import froggyFaviconUrl from './assets/froggy-favicon.png';
import froggyChoreRotatedUrl from './assets/froggy-chore-rotated.png';

interface Chore {
  name: string;
  lastDone?: Date;
  delay: number;
  assignee: string | null;
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
  add(name: string, delay: number, assignee?: string): Promise<void>;
  remove(name: string): Promise<void>;
  complete(name: string): Promise<void>;
  postpone(name: string): Promise<void>;
  setDue(name: string, dueDate: Date): Promise<void>;
  assign(name: string, assignee: string | null): Promise<void>;
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
  async setDue() {}
  async assign() {}
}

const ChoreContext = React.createContext<ChoreInteractor>(new NullChoreInteractor());

function makeChores(): ChoreInteractor {
  const [chores, setChores] = React.useState<Chore[] | null>(null);
  const [listId, setListId] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState<number | null>(null);
  const [created, setCreated] = React.useState<boolean>(false);

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

    async add(name, delay, assignee) {
      if (!listId || !chores || version === null) {
        throw new Error('Attempted to add a new chore before loading a list.');
      }

      const chore: Chore = { name, delay, lastDone: undefined, assignee: assignee ?? null };

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
    },

    async assign(name, assignee) {
      if (!listId || !chores || version === null) {
        throw new Error('Attempted to postpone a chore before loading a list.');
      }

      const newChores = chores.map((chore) => {
        if (chore.name !== name) {
          return chore;
        }

        return {
          ...chore,
          assignee,
        };
      });
      const { newVersion } = await api.postList(listId, newChores, version);
      setChores(newChores);
      setVersion(newVersion);
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
    },

    async setDue(name, dueDate) {
      if (!listId || !chores || version === null) {
        throw new Error('Attempted to postpone a chore before loading a list.');
      }

      const newChores = chores.map((chore) => {
        if (chore.name !== name) {
          return chore;
        }

        const dayMs = 24 * 60 * 60 * 1000;
        const newLastDone = new Date(dueDate.getTime() + dayMs - chore.delay * dayMs);

        return {
          ...chore,
          lastDone: newLastDone,
        };
      });
      const { newVersion } = await api.postList(listId, newChores, version);
      setChores(newChores);
      setVersion(newVersion);
    },
  };
}

function useChores(): ChoreInteractor {
  return React.useContext(ChoreContext);
}

interface DelayDatePicker {
  prompt(): Promise<number | null>;
}

const NullDelayDatePicker = {
  async prompt() {
    return null;
  },
};

const DelayDatePickerContext = React.createContext<DelayDatePicker>(NullDelayDatePicker);

function DelayDatePickerProvider({ children }: { children?: React.ReactNode }) {
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);

  // Having both of these is kinda dumb but I don't feel like refactoring to be smarter
  const dateInputRef = React.useRef<HTMLInputElement | null>(null);
  const [dateString, setDateString] = React.useState('');

  const delayDatePicker = React.useMemo(() => {
    return {
      async prompt(): Promise<number | null> {
        const dialog = dialogRef.current;
        const dateInput = dateInputRef.current;
        if (!dialog || !dateInput) {
          return null;
        }

        return new Promise((resolve) => {
          dialog.addEventListener('close', () => {
            resolve(dialog.returnValue === 'cancel' ? null : Date.parse(dateInput.value));
          });
          setDateString('');
          dialog.showModal();
        });
      },
    };
  }, []);

  const handleClickDialog = React.useCallback((event: React.MouseEvent) => {
    if (event.target === dialogRef.current) {
      dialogRef.current.close('cancel');
    }
  }, []);

  const handleChangeDate = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setDateString(event.target.value);
  }, []);

  return (
    <DelayDatePickerContext.Provider value={delayDatePicker}>
      <dialog className="date-picker-dialog" ref={dialogRef} onClick={handleClickDialog}>
        <form className="date-picker-contents">
          <div className="date-picker-prompt">
            Delay chore until
            <input ref={dateInputRef} type="date" value={dateString} onChange={handleChangeDate} />
          </div>
          <div className="date-picker-choices">
            <button className="cancel" value="cancel" formMethod="dialog">
              Cancel
            </button>
            <button className="ok" value="default" formMethod="dialog" disabled={dateString === null}>
              OK
            </button>
          </div>
        </form>
      </dialog>
      {children}
    </DelayDatePickerContext.Provider>
  );
}

function useDelayDatePicker() {
  return React.useContext(DelayDatePickerContext);
}

function DialogBox({ children }) {
  return (
    <div className="box-border dialog-box">
      <div className="portrait">
        <img src={frogPortraitUrl} />
      </div>
      <div className="speech">
        <p id="frog-say">{children}</p>
      </div>
    </div>
  );
}

function Welcome() {
  const { create } = useChores();

  function handleClickCreate() {
    create();
  }

  return (
    <>
      <button className="create-list" onClick={handleClickCreate}>
        Create chore list
      </button>
      <DialogBox>
        I can help you remember when to do your chores!
        <br />
        <br />
        Click the button above to create a new list of chores.
      </DialogBox>
    </>
  );
}

interface AddChoreFormProps {
  hideAssignees: boolean;
}

function AddChoreForm({ hideAssignees }: AddChoreFormProps) {
  const { add } = useChores();
  const [name, setName] = React.useState('');
  const [delay, setDelay] = React.useState('');
  const [assignee, setAssignee] = React.useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    if (!name || !delay) {
      return;
    }

    await add(name, Number.parseInt(delay), assignee);
    setName('');
    setDelay('');
    setAssignee('');
  }

  return (
    <form id="new-chore-form" onSubmit={handleSubmit}>
      <input
        type="text"
        name="name"
        placeholder="Chore name"
        required
        value={name}
        onInput={(e) => setName((e.target as HTMLInputElement).value)}
      />
      <input
        type="number"
        name="delay"
        placeholder="Days until due again"
        value={delay}
        onInput={(e) => setDelay((e.target as HTMLInputElement).value)}
      />
      <input
        type={hideAssignees ? 'hidden' : 'text'}
        name="assignee"
        placeholder="Assignee (optional)"
        value={assignee}
        onInput={(e) => setAssignee((e.target as HTMLInputElement).value)}
      />
      <button type="submit" className="add">
        Add
      </button>
    </form>
  );
}

interface ListViewProps {
  listId: string;
}

function ListView({ listId }: ListViewProps) {
  const { chores, complete, remove, created, postpone, setDue, assign } = useChores();
  const [assigneeFilter, setAssigneeFilter] = React.useState<string | null>(
    localStorage.getItem(`assigneeFilter-${listId}`) || null
  );
  const [hideAssignees, setHideAssignees] = React.useState<boolean>(
    localStorage.getItem(`hideAssignees-${listId}`) === 'true'
  );
  const delayDatePicker = useDelayDatePicker();

  async function handleClickDone(chore: Chore) {
    await complete(chore.name);
  }

  async function handleClickDelete(chore: Chore) {
    await remove(chore.name);
  }

  async function handleClickPostpone(chore: Chore) {
    await postpone(chore.name);
  }

  async function handleHoldPostpone(chore: Chore) {
    const newDueDateMs = await delayDatePicker.prompt();
    if (!newDueDateMs) {
      return;
    }

    const newDueDate = new Date(newDueDateMs);
    await setDue(chore.name, newDueDate);
  }

  async function handleClickEditAssignee(chore: Chore) {
    const newAssignee = window.prompt('Enter new assignee', chore.assignee ?? '');
    if (newAssignee !== null) {
      assign(chore.name, newAssignee || null);
    }
  }

  function handleChangeAssigneeFilter(event: React.ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value ?? null;
    setAssigneeFilter(value);
    localStorage.setItem(`assigneeFilter-${listId}`, value || '');
  }

  function handleChangeHideAssignees(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.checked ?? false;
    setHideAssignees(value);
    localStorage.setItem(`hideAssignees-${listId}`, value ? 'true' : 'false');
  }

  if (chores === undefined) {
    return <div className="message">Loading...</div>;
  } else if (chores === null) {
    return <div className="message">List not found.</div>;
  }

  const assignees = Array.from(new Set(chores.map((c) => c.assignee).filter((a) => a))) as string[];

  const filteredChores = assigneeFilter
    ? chores.filter((chore) => !chore.assignee || chore.assignee === assigneeFilter)
    : chores;

  const sortedChores = [...filteredChores].sort((a, b) => choreTimeUntilDue(a) - choreTimeUntilDue(b));

  const dueChores = sortedChores.filter((chore) => choreDueDays(chore) < 1);
  const doneTodayChores = sortedChores.filter((chore) => choreDoneToday(chore));
  const upcomingChores = sortedChores.filter((chore) => !choreDoneToday(chore) && choreDueDays(chore) >= 1);

  return (
    <>
      {created && (
        <DialogBox>
          Bookmark this page! If you lose the URL you won't be able to get back to it! Anyone with the URL can view and
          edit it.
        </DialogBox>
      )}
      {assignees.length > 1 && (
        <div className="assigneeFilter">
          View chores for{' '}
          <select value={assigneeFilter ?? ''} onChange={handleChangeAssigneeFilter}>
            <option value="">All</option>
            {assignees.map((assignee) => (
              <option value={assignee} key={assignee}>
                {assignee}
              </option>
            ))}
          </select>
        </div>
      )}
      {dueChores.length > 0 ? (
        <>
          <h2>Due</h2>
          <ul className="chore-list">
            {dueChores.map((chore) => (
              <ChoreListItem
                key={chore.name}
                chore={chore}
                onClickDone={handleClickDone}
                onClickDelete={handleClickDelete}
                onClickPostpone={handleClickPostpone}
                onHoldPostpone={handleHoldPostpone}
                onClickEditAssignee={handleClickEditAssignee}
                hideAssignees={hideAssignees}
              />
            ))}
          </ul>
        </>
      ) : (
        <DialogBox>You're all caught up, nice work! Time to relax.</DialogBox>
      )}
      {doneTodayChores.length > 0 && (
        <>
          <h2>Completed</h2>
          <ul className="chore-list">
            {doneTodayChores.map((chore) => (
              <ChoreListItem
                key={chore.name}
                chore={chore}
                onClickDelete={handleClickDelete}
                onClickPostpone={handleClickPostpone}
                onHoldPostpone={handleHoldPostpone}
                onClickEditAssignee={handleClickEditAssignee}
                hideAssignees={hideAssignees}
              />
            ))}
          </ul>
        </>
      )}
      {upcomingChores.length > 0 && (
        <>
          <h2>Upcoming</h2>
          <ul className="chore-list">
            {upcomingChores.map((chore) => (
              <ChoreListItem
                key={chore.name}
                chore={chore}
                onClickDone={handleClickDone}
                onClickDelete={handleClickDelete}
                onClickPostpone={handleClickPostpone}
                onHoldPostpone={handleHoldPostpone}
                onClickEditAssignee={handleClickEditAssignee}
                hideAssignees={hideAssignees}
              />
            ))}
          </ul>
        </>
      )}
      <AddChoreForm hideAssignees={hideAssignees} />
      <details className="chore-list-preferences">
        <summary>Preferences</summary>
        <label className="preference">
          <input type="checkbox" checked={hideAssignees} onChange={handleChangeHideAssignees} />
          <span className="preference-name">Hide Assignees</span>
        </label>
      </details>
    </>
  );
}

interface ChoreListItemProps {
  chore: Chore;
  onClickDone?: (chore: Chore) => void;
  onClickDelete?: (chore: Chore) => void;
  onClickPostpone?: (chore: Chore) => void;
  onHoldPostpone?: (chore: Chore) => void;
  onClickEditAssignee?: (chore: Chore) => void;
  hideAssignees: boolean;
}

function ChoreListItem({
  chore,
  onClickDone,
  onClickDelete,
  onClickPostpone,
  onHoldPostpone,
  onClickEditAssignee,
  hideAssignees,
}: ChoreListItemProps) {
  return (
    <li className="chore-list-item" key={chore.name}>
      <span className="name">
        {choreDoneToday(chore) && <img src={froggyFaviconUrl} className="done-today" />}
        {chore.name}
      </span>
      {choreDueDays(chore) > 0 && <span className="status">{choreStatus(chore)}</span>}
      {!hideAssignees && (
        <span className="assignee">
          {chore.assignee || 'anyone'}
          {onClickEditAssignee && (
            <ChoreListButton className="edit inline" onClick={() => onClickEditAssignee(chore)}>
              ✎
            </ChoreListButton>
          )}
        </span>
      )}
      {onClickDone && (
        <ChoreListButton className="complete" type="button" onClick={() => onClickDone(chore)}>
          ✔
        </ChoreListButton>
      )}
      {onClickPostpone && (
        <ChoreListButton
          className="postpone"
          type="button"
          onClick={() => onClickPostpone(chore)}
          onHold={onHoldPostpone ? () => onHoldPostpone(chore) : undefined}
        >
          +
        </ChoreListButton>
      )}
      {onClickDelete && (
        <ChoreListButton className="delete" type="button" onClick={() => onClickDelete(chore)}>
          ✖
        </ChoreListButton>
      )}
    </li>
  );
}

interface ChoreListButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  onClick?: () => any;
  onHold?: () => any;
  holdDelay?: number;
}

function ChoreListButton({ children, onClick, onHold, holdDelay = 300, ...htmlProps }: ChoreListButtonProps) {
  const handlePointerDown = React.useCallback(
    (event: React.MouseEvent) => {
      // Call hold after holdDelay seconds
      const downTime = Date.now();
      const holdTimeout = setTimeout(() => {
        onHold?.();
      }, holdDelay);

      // Call click and cancel hold if pointer up is within holdDelay
      const pointerUpCallback = () => {
        if (Date.now() - downTime < holdDelay) {
          onClick?.();
          clearTimeout(holdTimeout);
        }
      };
      event.target.addEventListener('pointerup', pointerUpCallback, { once: true });

      // Cancel both click and hold if the pointer leaves the button
      event.target.addEventListener(
        'pointerout',
        () => {
          clearTimeout(holdTimeout);
          event.target.removeEventListener('pointerup', pointerUpCallback);
        },
        { once: true }
      );

      // If any props change, cancel click and hold
      return () => {
        clearTimeout(holdTimeout);
        event.target.removeEventListener('pointerup', pointerUpCallback);
      };
    },
    [holdDelay, onClick, onHold]
  );

  // Preserve native click behavior
  if (onClick && !onHold) {
    return (
      <button {...htmlProps} onClick={onClick}>
        {children}
      </button>
    );
  }
  return (
    <button {...htmlProps} onPointerDown={handlePointerDown}>
      {children}
    </button>
  );
}

function App() {
  const url = new URL(window.location.href);
  const listId = url.searchParams.get('listId');
  const choreInteractor = makeChores();

  React.useEffect(() => {
    if (listId) {
      choreInteractor.load(listId);
    }
  }, []);

  return (
    <ChoreContext.Provider value={choreInteractor}>
      <DelayDatePickerProvider>
        <h1 className="header">
          <img className="froggy-rotated" src={froggyChoreRotatedUrl} />
          <a href="/">Froggy Chore</a>
        </h1>
        {!listId ? <Welcome /> : <ListView listId={listId} />}
      </DelayDatePickerProvider>
    </ChoreContext.Provider>
  );
}

// Kickoff!
const root = createRoot(document.getElementById('container'));
root.render(<App />);

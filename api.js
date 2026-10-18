// QuickNotes API client (practice version, talks to JSONPlaceholder)
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("notes-list");

// ---------- Reusable request helper ----------
// Calls fetch, checks response.ok and throws on HTTP errors.
async function request(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return { data: await response.json(), status: response.status };
}

// ---------- UI helpers ----------
function setStatus(message, type = "") {
  statusEl.textContent = message; // textContent only: never innerHTML
  statusEl.className = type;
}

function setBusy(isBusy) {
  loadBtn.disabled = isBusy;
  document.querySelectorAll(".delete-btn").forEach((b) => (b.disabled = isBusy));
}

function showEmptyState() {
  const li = document.createElement("li");
  li.className = "empty";
  li.textContent = "No notes yet.";
  listEl.appendChild(li);
}

function createNoteElement(note) {
  const li = document.createElement("li");
  li.dataset.id = note.id;

  const title = document.createElement("h3");
  title.textContent = note.title;

  const body = document.createElement("p");
  body.textContent = note.body;

  li.append(title, body);
  return li;
}

function renderNotes(notes) {
  listEl.replaceChildren();
  if (notes.length === 0) {
    showEmptyState();
    return;
  }
  notes.forEach((note) => listEl.appendChild(createNoteElement(note)));
}

// ---------- GET: load 10 notes ----------
async function loadNotes() {
  setStatus("Loading notes...", "loading");
  setBusy(true);
  try {
    const { data } = await request(`${API_URL}?_limit=10`);
    renderNotes(data);
    if (data.length === 0) {
      setStatus("The server returned no notes.", "success");
    } else {
      setStatus(`Loaded ${data.length} notes from the server.`, "success");
    }
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we could not load your notes. Please check your connection and try again.", "error");
  } finally {
    setBusy(false);
  }
}

loadBtn.addEventListener("click", loadNotes);

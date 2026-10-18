// QuickNotes API client (practice version, talks to JSONPlaceholder)
const API_URL = "https://jsonplaceholder.typicode.com/posts";

const loadBtn = document.getElementById("load-btn");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("notes-list");
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("title-input");
const bodyInput = document.getElementById("body-input");
const submitBtn = document.getElementById("submit-btn");

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
  submitBtn.disabled = isBusy;
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

// ---------- Validation ----------
const MAX_TITLE_LENGTH = 100;

function validateTitle(title) {
  if (title.length === 0) return "Please enter a title.";
  if (title.length > MAX_TITLE_LENGTH) {
    return `The title must be at most ${MAX_TITLE_LENGTH} characters (currently ${title.length}).`;
  }
  return null; // valid
}

// ---------- POST: create a note ----------
async function createNote(event) {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();

  const problem = validateTitle(title);
  if (problem) {
    setStatus(problem, "error");
    titleInput.focus();
    return;
  }

  setStatus("Creating note...", "loading");
  setBusy(true);
  try {
    const { data, status } = await request(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ title, body, userId: 1 }),
    });
    // Remove the empty-state message if it is showing, then add to the top.
    const empty = listEl.querySelector(".empty");
    if (empty) empty.remove();
    // JSONPlaceholder echoes our fields back with a new id (101).
    listEl.prepend(createNoteElement({ id: data.id, title: data.title, body: data.body }));
    setStatus(`Note created (status ${status}, id ${data.id}).`, "success");
    noteForm.reset();
  } catch (error) {
    console.error(error);
    setStatus("Sorry, we could not create your note. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

loadBtn.addEventListener("click", loadNotes);
noteForm.addEventListener("submit", createNote);

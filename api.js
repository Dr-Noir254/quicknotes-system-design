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

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-btn";
  deleteBtn.textContent = "Delete";
  deleteBtn.addEventListener("click", () => deleteNote(note.id, li));

  li.append(title, body, deleteBtn);
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

// ---------- DELETE: remove a note ----------
// NOTE ON JSONPLACEHOLDER: it is a fake API. It accepts POST and DELETE and
// answers with a success status, but it never stores or removes anything.
// Our approach: we treat a successful (2xx) DELETE response as the server's
// confirmation and remove the note from the page only after that response
// arrives (not before). Because nothing is really deleted, clicking "Load notes"
// again brings the original 10 notes back, and a note we created (id 101) cannot
// be found on the server later. A real QuickNotes API would persist the change.
async function deleteNote(id, listItem) {
  setStatus(`Deleting note ${id}...`, "loading");
  setBusy(true);
  try {
    const { status } = await request(`${API_URL}/${id}`, { method: "DELETE" });
    listItem.remove();
    if (listEl.children.length === 0) showEmptyState();
    setStatus(`Note ${id} deleted (status ${status}).`, "success");
  } catch (error) {
    console.error(error);
    setStatus(`Sorry, we could not delete note ${id}. Please try again.`, "error");
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

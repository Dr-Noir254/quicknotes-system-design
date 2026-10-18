# QuickNotes System Design

QuickNotes is moving from a browser-only app to an online service for 1 million users. This repository has two parts:

1. **A small API client** (HTML, CSS and JavaScript) that proves the front end can talk to a REST API. It uses the free [JSONPlaceholder](https://jsonplaceholder.typicode.com) practice API and supports loading (GET), creating (POST) and deleting (DELETE) notes, with loading, success, error and empty states, input validation and disabled buttons during requests.
2. **Design documents** for the real backend: the REST API, the database model and the system architecture.

## How to run the API client

No build step or server is needed.

1. Clone the repository: `git clone https://github.com/your-username/quicknotes-system-design.git`
2. Open `index.html` in your browser (double-click it, or use a tool such as VS Code Live Server).
3. Click **Load notes** to fetch 10 notes, use the form to create a note, and click **Delete** on a note to remove it.

An internet connection is required. Note: JSONPlaceholder is a fake API. Created and deleted notes are not really saved, so reloading brings back the original 10 notes (explained in a comment in `api.js`).

## Project files

| File | Purpose |
|------|---------|
| `index.html` | Page structure: form, load button, status message and notes list |
| `api.js` | `request()` helper plus GET, POST and DELETE, validation and UI states |
| `style.css` | Styling, including distinct success and error messages |
| `docs/` | The three design documents below |

## Design documents

- [API design](docs/api-design.md): REST endpoints, JSON examples and error codes
- [Data model](docs/data-model.md): tables, relationships, SQL, indexes and the SQL vs NoSQL decision
- [Architecture](docs/architecture.md): requirements, load estimate, diagram, request flows and trade-offs

## What I learned

- **A reusable `request()` function keeps error handling in one place.** `fetch` does not throw on HTTP errors such as 404 or 500, so checking `response.ok` and throwing myself is essential, and wrapping calls in `try / catch / finally` guarantees buttons are re-enabled.
- **Every screen needs four states:** loading, success, error and empty. Showing them makes the app feel reliable, and using `textContent` instead of `innerHTML` prevents user text from being run as HTML (XSS).
- **Good API design uses nouns, HTTP verbs and the right status codes** (201 for create, 204 for delete, 400/401/403/404 for client errors) and one consistent error format.
- **Data modelling:** a many-to-many relationship (notes and tags) needs a join table, and a well-chosen index such as `(user_id, created_at)` matches the most common query.
- **Scaling starts with numbers.** Estimating about 35 reads/s and 7 writes/s showed the system is read-heavy, which justifies a cache and a read replica, and removing single points of failure matters more than raw speed at this size.

# QuickNotes REST API Design

This document describes the **real** QuickNotes API the backend team should build (not JSONPlaceholder).

- Base URL: `https://api.quicknotes.example/v1`
- Format: JSON (`Content-Type: application/json`)
- Auth: `Authorization: Bearer <access_token>` on every endpoint except register and login
- Design rules: nouns in paths, HTTP verbs for actions, plural resource names, the server owns ids and timestamps.

## 1. Endpoints

| # | Method | Path | Description | Success status |
|---|--------|------|-------------|----------------|
| 1 | POST | `/auth/register` | Create a user account | 201 Created |
| 2 | POST | `/auth/login` | Exchange email and password for an access token | 200 OK |
| 3 | GET | `/notes` | List the current user's notes (paginated, filter by `tag`, search with `q`) | 200 OK |
| 4 | POST | `/notes` | Create a note | 201 Created |
| 5 | GET | `/notes/{id}` | Get one note | 200 OK |
| 6 | PUT | `/notes/{id}` | Replace a note's title, body and tags | 200 OK |
| 7 | PATCH | `/notes/{id}` | Partially update a note | 200 OK |
| 8 | DELETE | `/notes/{id}` | Delete a note | 204 No Content |
| 9 | GET | `/tags` | List the current user's tags | 200 OK |
| 10 | POST | `/notes/{id}/tags` | Attach a tag to a note (creates the tag if new) | 201 Created |
| 11 | DELETE | `/notes/{id}/tags/{tagId}` | Remove a tag from a note | 204 No Content |

Query parameters for `GET /notes`: `limit` (default 20, max 100), `cursor` (opaque pagination cursor), `tag` (tag name), `q` (text search).

## 2. Request and response examples

### Create a note: `POST /notes`

Request:

```http
POST /v1/notes
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json
```

```json
{
  "title": "Buy milk",
  "body": "2 litres, full cream",
  "tags": ["shopping", "home"]
}
```

Response: `201 Created` with a `Location: /v1/notes/9001` header.

```json
{
  "id": 9001,
  "userId": 42,
  "title": "Buy milk",
  "body": "2 litres, full cream",
  "tags": ["shopping", "home"],
  "createdAt": "2026-10-18T13:45:10Z",
  "updatedAt": "2026-10-18T13:45:10Z"
}
```

### List notes: `GET /notes?limit=2`

Response: `200 OK`

```json
{
  "data": [
    {
      "id": 9001,
      "userId": 42,
      "title": "Buy milk",
      "body": "2 litres, full cream",
      "tags": ["shopping", "home"],
      "createdAt": "2026-10-18T13:45:10Z",
      "updatedAt": "2026-10-18T13:45:10Z"
    },
    {
      "id": 8990,
      "userId": 42,
      "title": "Project ideas",
      "body": "Write the system design doc",
      "tags": ["work"],
      "createdAt": "2026-10-17T09:02:44Z",
      "updatedAt": "2026-10-17T09:30:00Z"
    }
  ],
  "nextCursor": "eyJpZCI6ODk5MH0",
  "limit": 2
}
```

An empty account returns `200 OK` with `"data": []` and `"nextCursor": null` (an empty list is not an error).

## 3. Error status codes

| Status | Meaning | When QuickNotes returns it |
|--------|---------|----------------------------|
| 400 Bad Request | Invalid input | Missing title, title longer than 100 characters, malformed JSON, bad `limit` |
| 401 Unauthorized | Not authenticated | Missing, expired or invalid token; wrong login password |
| 403 Forbidden | Authenticated but not allowed | Trying to read or change another user's note |
| 404 Not Found | Resource does not exist | Unknown note id or tag id |
| 409 Conflict | State conflict | Registering an email that already exists |
| 429 Too Many Requests | Rate limit exceeded | Too many requests from one client |
| 500 Internal Server Error | Unexpected server fault | Unhandled bug or failed dependency (never leaks stack traces) |

All errors use one consistent body:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required and must be at most 100 characters.",
    "details": [
      { "field": "title", "issue": "must be between 1 and 100 characters" }
    ],
    "requestId": "req_7f3a9c21"
  }
}
```

Example for a note that belongs to someone else (`403 Forbidden`):

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have access to this note.",
    "requestId": "req_1b84de07"
  }
}
```

## 4. Design notes

- **Idempotency:** GET, PUT and DELETE are idempotent. POST is not, so clients may send an `Idempotency-Key` header to make retries of `POST /notes` safe.
- **Ownership:** the user id comes from the token, never from the request body, so users can only touch their own notes (otherwise 403).
- **Pagination:** cursor-based, because offset pagination gets slow and inconsistent on large, changing tables.
- **Versioning:** `/v1` in the path lets us ship breaking changes as `/v2`.
- **Validation:** title required, 1 to 100 characters; body optional, up to 10,000 characters.

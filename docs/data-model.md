# QuickNotes Data Model

## 1. Entities

### users

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | **Primary key**, auto-increment |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| display_name | VARCHAR(100) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL, default now |

### notes

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | **Primary key**, auto-increment |
| user_id | BIGINT | NOT NULL, **foreign key** to `users.id` |
| title | VARCHAR(100) | NOT NULL |
| body | TEXT | NULL allowed (body is optional) |
| created_at | TIMESTAMP | NOT NULL, default now |
| updated_at | TIMESTAMP | NOT NULL, default now |

### tags

| Column | Type | Constraints |
|--------|------|-------------|
| id | BIGINT | **Primary key**, auto-increment |
| user_id | BIGINT | NOT NULL, **foreign key** to `users.id` |
| name | VARCHAR(50) | NOT NULL, unique per user |

### note_tags (join table)

| Column | Type | Constraints |
|--------|------|-------------|
| note_id | BIGINT | **Foreign key** to `notes.id`, part of the primary key |
| tag_id | BIGINT | **Foreign key** to `tags.id`, part of the primary key |

Primary key: composite `(note_id, tag_id)`, which also stops the same tag being attached twice to one note.

## 2. Relationships

- **users to notes: one-to-many.** One user owns many notes; each note belongs to exactly one user (`notes.user_id`).
- **users to tags: one-to-many.** One user owns many tags; each tag belongs to one user (`tags.user_id`).
- **notes to tags: many-to-many.** A note can have many tags ("shopping", "home") and a tag can be on many notes. A relational database cannot store this directly, so the join table `note_tags` holds one row per note-tag pair, turning it into two one-to-many relationships.
- Deleting a note or tag removes its `note_tags` rows (`ON DELETE CASCADE`). Deleting a user removes their notes and tags.

## 3. CREATE TABLE statements (PostgreSQL)

```sql
CREATE TABLE users (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(100) NOT NULL,
    body       TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name    VARCHAR(50) NOT NULL,
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- Index (see section 5)
CREATE INDEX idx_notes_user_created ON notes (user_id, created_at DESC);
-- Lets us find all notes for a tag quickly (the primary key already covers note_id first)
CREATE INDEX idx_note_tags_tag ON note_tags (tag_id);
```

## 4. Example queries

**a) List a user's 20 newest notes** (backs `GET /notes`):

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = 42
ORDER BY created_at DESC
LIMIT 20;
```

**b) JOIN: all notes with the tag "shopping" for a user** (backs `GET /notes?tag=shopping`):

```sql
SELECT n.id, n.title, n.body, n.created_at
FROM notes n
JOIN note_tags nt ON nt.note_id = n.id
JOIN tags t       ON t.id = nt.tag_id
WHERE n.user_id = 42
  AND t.name = 'shopping'
ORDER BY n.created_at DESC;
```

**c) Count notes per tag for a user** (aggregate with a LEFT JOIN so unused tags show 0):

```sql
SELECT t.name, COUNT(nt.note_id) AS note_count
FROM tags t
LEFT JOIN note_tags nt ON nt.tag_id = t.id
WHERE t.user_id = 42
GROUP BY t.id, t.name
ORDER BY note_count DESC;
```

**d) Create a note** (backs `POST /notes`):

```sql
INSERT INTO notes (user_id, title, body)
VALUES (42, 'Buy milk', '2 litres, full cream')
RETURNING id, created_at;
```

## 5. Indexes and why

- **`idx_notes_user_created ON notes (user_id, created_at DESC)`**: almost every read is "this user's newest notes". Without it, the database scans the whole `notes` table (hundreds of millions of rows at scale). With it, the database jumps straight to one user's rows already sorted by date, so query (a) is fast and needs no extra sort.
- **`idx_note_tags_tag ON note_tags (tag_id)`**: makes tag filtering (query b) fast, because the composite primary key only helps lookups that start with `note_id`.
- The `UNIQUE` constraints on `users.email` and `(tags.user_id, tags.name)` create indexes automatically, making login lookups fast.

## 6. SQL vs NoSQL decision

**Decision: SQL (PostgreSQL).** QuickNotes data is clearly relational: users own notes, and notes and tags form a many-to-many relationship. SQL enforces that with foreign keys and constraints, supports JOINs for tag filtering, and gives ACID transactions, so creating a note and its tags either fully succeeds or fully fails. The access patterns are simple and well known, and 1 million users produce only a few hundred gigabytes per year, which a single PostgreSQL primary with read replicas handles comfortably. A NoSQL store such as DynamoDB would scale writes further, but would make tag queries and consistency harder; we can revisit that (or shard by `user_id`) if we grow well past tens of millions of users. We may also add a search engine later for full-text search, but PostgreSQL remains the source of truth.

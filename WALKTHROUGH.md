# 🚀 MiniConnect Phase 2 — Posts & Feed Walkthrough

## Summary of Changes

Phase 2 adds the **Posts & Feed** system to MiniConnect — users can now create posts with optional images, view a feed of all posts, and delete their own posts.

---

## Files Created / Modified

### Backend (New Files)

| File | Purpose |
|------|---------|
| `backend/controllers/postController.js` | CRUD logic for posts (create, get all, get by ID, delete) |
| `backend/routes/postRoutes.js` | Express routes for `/api/posts` with multer image upload |

### Backend (Modified Files)

| File | Changes |
|------|---------|
| `backend/server.js` | Imported and registered `/api/posts` routes |
| `backend/package.json` | Updated description to Phase 1 & 2 |

### Database (Modified)

| File | Changes |
|------|---------|
| `database/schema.sql` | Added `posts` table with foreign key to `users`, plus indexes |

### Frontend (New Files)

| File | Purpose |
|------|---------|
| `frontend/feed.html` | Feed page with create-post form and posts feed |
| `frontend/js/feed.js` | All feed logic: create, display, delete posts, image preview, lightbox |

### Frontend (Modified Files)

| File | Changes |
|------|---------|
| `frontend/css/style.css` | Added ~600 lines of feed/post CSS (cards, create form, lightbox, responsive) |
| `frontend/profile.html` | Added Feed/Profile nav links to navbar |
| `frontend/js/auth.js` | Changed post-login redirect from `profile.html` → `feed.html` |

---

## API Endpoints (Phase 2)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/posts` | ✅ JWT | Create a new post (with optional image) |
| `GET` | `/api/posts` | ❌ Public | Get all posts (feed, newest first) |
| `GET` | `/api/posts/:id` | ❌ Public | Get a single post by ID |
| `DELETE` | `/api/posts/:id` | ✅ JWT | Delete a post (owner only) |

---

## Setup Instructions

1. **Run the SQL to create the posts table** in MySQL:
```sql
USE miniconnect;

CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

2. **Restart the backend server**: `npm run dev` from the `backend/` folder
3. **Visit** `http://localhost:5000/feed.html` after logging in

---

# 📚 Beginner Explanations

## 1. How Posts Are Stored

Think of the `posts` table as a **notebook** where each row is one post:

```
┌─────┬─────────┬──────────────────────┬──────────────────┬─────────────────────┐
│ id  │ user_id │ content              │ image_url        │ created_at          │
├─────┼─────────┼──────────────────────┼──────────────────┼─────────────────────┤
│ 1   │ 3       │ "Hello World!"       │ NULL             │ 2024-12-15 10:30:00 │
│ 2   │ 1       │ "My first photo 📸"  │ post-1-17...jpg  │ 2024-12-15 11:00:00 │
│ 3   │ 3       │ "Good morning!"      │ post-3-17...png  │ 2024-12-15 12:15:00 │
└─────┴─────────┴──────────────────────┴──────────────────┴─────────────────────┘
```

**How each column works:**

| Column | Purpose | Analogy |
|--------|---------|---------|
| `id` | Unique number for each post | Like a serial number |
| `user_id` | Who wrote this post (links to users table) | Like writing your name on the notebook page |
| `content` | The actual text of the post | The message you wrote |
| `image_url` | Filename of attached image (or NULL) | A photo you taped to the page |
| `created_at` | When the post was created | The date stamp |

**When you create a post**, this SQL runs:
```sql
INSERT INTO posts (user_id, content, image_url) VALUES (3, 'Hello World!', NULL);
```
- MySQL automatically generates the `id` (AUTO_INCREMENT)
- MySQL automatically sets `created_at` to the current time (DEFAULT CURRENT_TIMESTAMP)

---

## 2. How Images Are Uploaded

Image upload is a **multi-step process** involving both frontend and backend:

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  User picks  │────▶│  Browser     │────▶│   Multer     │────▶│  Database    │
│  an image    │     │  creates     │     │  saves file  │     │  stores      │
│  from PC     │     │  FormData    │     │  to /uploads │     │  filename    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
```

### Step-by-step:

**Step 1: User selects a file (Frontend)**
```javascript
// The <input type="file"> lets users pick a file from their computer
// When they select a file, we show a preview using FileReader
const reader = new FileReader();
reader.readAsDataURL(file);  // Converts file to base64 for preview
```

**Step 2: Browser creates FormData (Frontend)**
```javascript
// FormData is special — it can hold BOTH text AND files
const formData = new FormData();
formData.append('content', 'Hello World!');      // Text data
formData.append('post_image', file);              // File data
```

> **IMPORTANT:** When sending FormData, do NOT set `Content-Type: application/json`. The browser automatically sets it to `multipart/form-data` with a special boundary string. Setting it manually breaks the upload!

**Step 3: Multer processes the file (Backend)**
```javascript
// Multer is middleware that runs BEFORE your controller
// It intercepts the file from the request and saves it to disk
const storage = multer.diskStorage({
    destination: 'uploads/',                    // WHERE to save
    filename: 'post-3-1717789200000.jpg'       // HOW to name it
});
```

**Step 4: Controller saves filename to database (Backend)**
```javascript
// After multer runs, the file is available as req.file
const imageUrl = req.file ? req.file.filename : null;
// Save just the FILENAME to the database (not the whole file!)
await db.query('INSERT INTO posts ... VALUES (?, ?, ?)', [userId, content, imageUrl]);
```

**Step 5: Serving images back (Backend)**
```javascript
// Express serves files from the uploads folder as static assets
app.use('/uploads', express.static('uploads'));
// Now any image can be accessed at: http://localhost:5000/uploads/post-3-17...jpg
```

---

## 3. How Feed Data Is Fetched

The feed shows ALL posts from ALL users, sorted newest first. Here's how it works:

### The SQL Query (Backend)
```sql
SELECT 
    p.id, p.user_id, p.content, p.image_url, p.created_at,
    u.name AS author_name,
    u.profile_image AS author_avatar
FROM posts p
JOIN users u ON p.user_id = u.id
ORDER BY p.created_at DESC
```

**Breaking this down for a beginner:**

1. `FROM posts p` — "Start with the posts table, call it 'p' for short"
2. `JOIN users u ON p.user_id = u.id` — "For each post, find the matching user"
3. `u.name AS author_name` — "Get the user's name and call it 'author_name'"
4. `ORDER BY p.created_at DESC` — "Newest posts first"

**Visual example of the JOIN:**

```
Posts Table (p)              Users Table (u)
┌────┬─────────┐            ┌────┬──────────┐
│ id │ user_id │            │ id │ name     │
├────┼─────────┤            ├────┼──────────┤
│ 1  │ 3       │──────────▶│ 3  │ "Alice"  │
│ 2  │ 1       │──────────▶│ 1  │ "Bob"    │
└────┴─────────┘            └────┴──────────┘

Result after JOIN:
┌────┬─────────┬──────────────┐
│ id │ user_id │ author_name  │
├────┼─────────┼──────────────┤
│ 1  │ 3       │ "Alice"      │
│ 2  │ 1       │ "Bob"        │
└────┴─────────┴──────────────┘
```

### The Frontend Fetch (JavaScript)
```javascript
// 1. Call the API
const response = await fetch('http://localhost:5000/api/posts');
const data = await response.json();

// 2. Loop through posts and create HTML cards
data.posts.forEach(post => {
    // post.author_name = "Alice"  (from the JOIN!)
    // post.author_avatar = "profile-3-17...jpg"  (from the JOIN!)
    // post.content = "Hello World!"
    // post.image_url = "post-3-17...jpg" or null
});
```

---

## 4. How Frontend Talks to Backend

Frontend and backend communicate using the **Fetch API** over **HTTP**:

```
┌────────────────────────┐                    ┌────────────────────────┐
│      FRONTEND          │                    │       BACKEND          │
│    (Browser/HTML/JS)   │                    │   (Node.js/Express)    │
│                        │   HTTP Request     │                        │
│  fetch('/api/posts',{  │───────────────────▶│  router.post('/', ...) │
│    method: 'POST',     │                    │  req.body.content      │
│    body: formData      │                    │  req.file (image)      │
│  })                    │   HTTP Response    │                        │
│                        │◀───────────────────│  res.json({            │
│  const data = await    │                    │    success: true,      │
│    response.json()     │                    │    post: { ... }       │
│                        │                    │  })                    │
└────────────────────────┘                    └────────────────────────┘
```

### The 4 types of requests in Phase 2:

| Operation | HTTP Method | What Frontend Sends | What Backend Returns |
|-----------|-------------|--------------------|--------------------|
| Create Post | `POST` | FormData (text + file) + JWT token | New post object |
| Get Feed | `GET` | Nothing (just the URL) | Array of all posts |
| Get One Post | `GET` | Post ID in URL | Single post object |
| Delete Post | `DELETE` | Post ID in URL + JWT token | Success message |

### JWT Authentication in requests:
```javascript
// Protected routes require the JWT token in the Authorization header
const response = await fetch('/api/posts', {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIs...'  // JWT token
    },
    body: formData
});
```

The backend's auth middleware extracts the token, verifies it, and sets `req.userId`:
```javascript
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.userId = decoded.userId;  // Now the controller knows WHO is making the request
```

---

## 5. How MySQL Relationships Work

### The Foreign Key Relationship

```
users table (Parent)              posts table (Child)
┌────┬──────────┐                ┌────┬─────────┐
│ id │ name     │                │ id │ user_id │
├────┼──────────┤                ├────┼─────────┤
│ 1  │ "Bob"    │◀───────────────│ 2  │ 1       │
│ 2  │ "Carol"  │                │ 4  │ 1       │
│ 3  │ "Alice"  │◀───────────────│ 1  │ 3       │
│    │          │◀───────────────│ 3  │ 3       │
└────┴──────────┘                └────┴─────────┘
```

**What is a Foreign Key?**
- It's a column in one table that **references** the primary key in another table
- `posts.user_id` → `users.id` means "this post belongs to this user"
- It's like a **hyperlink** between tables

**What does it enforce?**
```sql
-- This would FAIL because there's no user with id = 999
INSERT INTO posts (user_id, content) VALUES (999, 'Hello');
-- Error: Cannot add or update a child row: a foreign key constraint fails
```

**What is ON DELETE CASCADE?**
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```
- If you delete a user, ALL their posts are automatically deleted too
- Think of it as: "If the parent is removed, remove all children"
- Without CASCADE, you'd get an error when trying to delete a user who has posts

### One-to-Many Relationship
- One **user** can have **many** posts (1:N)
- Each **post** belongs to exactly **one** user
- This is the most common relationship in databases

```
   One User                    Many Posts
┌──────────┐            ┌──────────────────┐
│ Alice     │──────────▶│ Post 1: "Hello!" │
│ (id: 3)  │──────────▶│ Post 3: "Morning"│
│           │──────────▶│ Post 7: "Update" │
└──────────┘            └──────────────────┘
```

### Why we use JOINs instead of separate queries:

❌ **Bad approach (2 queries):**
```javascript
// Query 1: Get the post
const post = await db.query('SELECT * FROM posts WHERE id = 1');
// Query 2: Get the user (separate trip to the database)
const user = await db.query('SELECT * FROM users WHERE id = ?', [post.user_id]);
```

✅ **Good approach (1 query with JOIN):**
```javascript
// Single query that gets BOTH post and user data at once
const result = await db.query(`
    SELECT p.*, u.name, u.profile_image
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = 1
`);
```

---

## 6. Interview Questions — Posts & Feed

### Basic Level 🟢

**Q1: What is a REST API?**
> REST (Representational State Transfer) is an architectural style for designing APIs. It uses HTTP methods:
> - `GET` = Read data
> - `POST` = Create data
> - `PUT/PATCH` = Update data
> - `DELETE` = Delete data
> 
> Each URL represents a "resource" (e.g., `/api/posts` = the posts resource).

**Q2: What is the difference between `POST` and `GET` HTTP methods?**
> `GET` retrieves data without modifying anything (safe, idempotent). Example: "Show me all posts."
> `POST` creates new data on the server (not idempotent — calling it twice creates two posts). Example: "Create a new post."

**Q3: What is a Foreign Key?**
> A column that creates a link between two tables. It references the primary key of another table. Example: `posts.user_id` references `users.id`. It ensures data integrity — you can't create a post for a non-existent user.

**Q4: What is `ON DELETE CASCADE`?**
> When a parent row is deleted, all related child rows are automatically deleted. Example: Deleting a user automatically deletes all their posts.

**Q5: What is `FormData` in JavaScript?**
> A built-in object that allows you to construct key-value pairs representing form fields and files. It's used for sending both text data AND file data to a server. The browser automatically sets the correct `Content-Type: multipart/form-data` header.

---

### Intermediate Level 🟡

**Q6: What is multer and why do we need it?**
> Multer is a Node.js middleware for handling `multipart/form-data` (file uploads). Express can't parse file uploads by default — it only handles JSON (`express.json()`) and URL-encoded data (`express.urlencoded()`). Multer intercepts file uploads, saves them to disk, and provides file metadata via `req.file`.

**Q7: What is an SQL JOIN? Explain types.**
> JOIN combines rows from two tables based on a related column.
> - **INNER JOIN**: Only returns rows that have matching values in both tables.
> - **LEFT JOIN**: Returns ALL rows from the left table, plus matching rows from the right. If no match, NULL is used.
> - **RIGHT JOIN**: Opposite of LEFT JOIN.
> - In our app, we use `JOIN` (INNER JOIN) so posts from deleted users won't appear.

**Q8: Why don't we store the actual image file in the database?**
> Databases are optimized for structured data (text, numbers), not binary blobs. Storing images in the database would:
> 1. Make the database very large and slow
> 2. Increase backup times
> 3. Waste database memory and connections
> Instead, we store images on the **file system** and only save the **filename** in the database.

**Q9: What is XSS and how do we prevent it?**
> XSS (Cross-Site Scripting) is when an attacker injects malicious JavaScript via user input. If someone posts `<script>alert('hacked')</script>` and we render it directly, the script executes. We prevent it using the `escapeHtml()` function that converts `<` to `&lt;`, `>` to `&gt;`, etc.

**Q10: What is middleware in Express?**
> Functions that run BETWEEN receiving a request and sending a response. They can:
> 1. Modify the request (e.g., `auth` middleware adds `req.userId`)
> 2. Modify the response
> 3. End the request-response cycle (e.g., return 401 if unauthorized)
> 4. Call `next()` to pass control to the next middleware

**Q11: How does JWT authentication work for protected routes?**
> 1. User logs in → server creates a JWT token containing the user's ID
> 2. Frontend stores the token in localStorage
> 3. For protected routes, frontend sends the token in the `Authorization: Bearer <token>` header
> 4. Backend's `auth` middleware extracts and verifies the token
> 5. If valid, it sets `req.userId` and calls `next()`
> 6. If invalid/expired, it returns 401 Unauthorized

---

### Advanced Level 🔴

**Q12: How would you implement pagination for the feed?**
> Use LIMIT and OFFSET in SQL:
> ```sql
> SELECT * FROM posts ORDER BY created_at DESC LIMIT 10 OFFSET 0;  -- Page 1
> SELECT * FROM posts ORDER BY created_at DESC LIMIT 10 OFFSET 10; -- Page 2
> ```
> The frontend would pass `?page=1&limit=10` as query parameters. For better performance with large datasets, use **cursor-based pagination** (WHERE created_at < last_seen_timestamp).

**Q13: Why do we use `async/await` instead of callbacks?**
> Database queries are asynchronous operations. `async/await` provides cleaner, more readable code compared to callbacks (which lead to "callback hell") or `.then()` chains. It allows us to write asynchronous code that looks synchronous, with proper error handling via `try/catch`.

**Q14: What would happen if two users try to create posts at the exact same time?**
> MySQL handles this using **connection pooling** and **transactions**. Each request gets its own connection from the pool, and INSERT operations are atomic. The `AUTO_INCREMENT` ensures unique IDs even with concurrent inserts. Our `mysql2` pool has a `connectionLimit: 10` which means up to 10 simultaneous queries.

**Q15: How would you add "likes" to posts?**
> Create a `likes` table with a **composite primary key**:
> ```sql
> CREATE TABLE likes (
>     user_id INT,
>     post_id INT,
>     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
>     PRIMARY KEY (user_id, post_id),
>     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
>     FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
> );
> ```
> This is a **Many-to-Many** relationship (one user can like many posts, one post can be liked by many users). The composite primary key prevents a user from liking the same post twice.

**Q16: What are database indexes and why did we add them?**
> Indexes are like the index at the back of a book — they help the database find rows faster without scanning every row. We added:
> - `idx_posts_user_id`: Speeds up "get all posts by user X" queries
> - `idx_posts_created_at`: Speeds up "get posts sorted by date" queries (the feed)
> 
> Trade-off: Indexes speed up reads but slow down writes (INSERT/UPDATE) because the index must also be updated.

**Q17: What is the N+1 query problem?**
> Loading 10 posts with 1 query for posts + 10 queries for each author = 11 queries (N+1). We avoid this by using JOIN to get posts AND author info in a **single query**. This is much more efficient.

**Q18: How would you implement image compression before uploading?**
> On the **frontend**, use the Canvas API to resize/compress images before sending:
> ```javascript
> const canvas = document.createElement('canvas');
> const ctx = canvas.getContext('2d');
> // Draw image at reduced size, then convert to blob
> canvas.toBlob(blob => formData.append('post_image', blob), 'image/jpeg', 0.8);
> ```
> On the **backend**, use libraries like `sharp` to resize/compress after upload.

**Q19: What is CORS and why is it needed?**
> CORS (Cross-Origin Resource Sharing) is a security mechanism. Browsers block requests from one origin (e.g., `localhost:3000`) to another (e.g., `localhost:5000`) by default. We use the `cors` middleware to tell the browser "it's okay, allow requests from the frontend."

**Q20: How would you secure the DELETE endpoint beyond ownership checks?**
> 1. **Rate limiting**: Prevent mass-delete attacks (use `express-rate-limit`)
> 2. **Soft delete**: Instead of actually deleting, set a `deleted_at` timestamp
> 3. **Admin roles**: Allow admins to delete any post
> 4. **Input validation**: Ensure `:id` is a valid integer (prevent SQL injection)
> 5. **Audit logging**: Log who deleted what and when

---

# 🚀 MiniConnect Phase 3 — Likes & Comments Walkthrough

## Summary of Changes

Phase 3 adds **Interactions** to MiniConnect — users can now like/unlike posts, and add comments to posts. The feed dynamically displays interaction counts and highlights posts the current user has already liked.

---

## 📚 Phase 3 Explanations

### 1. How Likes Are Stored

Likes are tracked in a new `likes` table. Instead of having a "likes" number column in the posts table, we store each individual like as a separate row.

```
likes Table:
┌────┬─────────┬─────────┐
│ id │ user_id │ post_id │
├────┼─────────┼─────────┤
│ 1  │ 3       │ 10      │  <-- User 3 liked Post 10
│ 2  │ 1       │ 10      │  <-- User 1 liked Post 10
│ 3  │ 3       │ 15      │  <-- User 3 liked Post 15
└────┴─────────┴─────────┘
```

**Why do it this way?**
1. We know *who* liked the post (so they can unlike it later).
2. We prevent duplicate likes using a `UNIQUE KEY (user_id, post_id)`.
3. We can easily count the total likes using `COUNT(*)`.

### 2. How Comments Are Stored

Comments are tracked in a `comments` table. 

```
comments Table:
┌────┬─────────┬─────────┬───────────────────┐
│ id │ post_id │ user_id │ comment           │
├────┼─────────┼─────────┼───────────────────┤
│ 1  │ 10      │ 3       │ "Great photo!"    │
│ 2  │ 10      │ 1       │ "Thanks 😊"       │
└────┴─────────┴─────────┴───────────────────┘
```

### 3. Database Relationships

We now have multiple **One-to-Many (1:N)** relationships:
- 1 User -> Many Likes
- 1 Post -> Many Likes
- 1 User -> Many Comments
- 1 Post -> Many Comments

This also forms a **Many-to-Many (M:N)** relationship between Users and Posts through the `likes` table. 

> **Important:** All foreign keys use `ON DELETE CASCADE`. If Post #10 is deleted, all rows in `likes` and `comments` with `post_id = 10` are automatically deleted by the database!

### 4. Why Separate Tables Are Used

A beginner might ask: *"Why not just put a `likes_count` column and a `comments_array` column in the posts table?"*

1. **Normalization:** Relational databases (like MySQL) are designed for flat tables. Arrays inside columns are an anti-pattern in SQL.
2. **Concurrency:** If 10 people like a post at the exact same millisecond, trying to do `UPDATE posts SET likes = likes + 1` can lead to race conditions. Inserting separate rows is perfectly safe.
3. **Auditability:** We need to know *who* liked it so we can highlight the heart icon in red for them.

### 5. How Like Counts Are Calculated

Instead of storing the total number, we count it dynamically when fetching the feed using **Subqueries**:

```sql
SELECT 
    p.*,
    (SELECT COUNT(*) FROM likes WHERE post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments WHERE post_id = p.id) AS comment_count,
    (SELECT COUNT(*) > 0 FROM likes WHERE post_id = p.id AND user_id = ?) AS has_liked
FROM posts p
```
This tells MySQL: *"For every post row you return, run these three mini-queries to get the total likes, total comments, and a true/false if the current user liked it."*

---

## 6. Interview Questions — Likes & Comments

### Intermediate Level 🟡

**Q21: How do you prevent a user from liking a post multiple times?**
> On the database level, we use a `UNIQUE KEY` constraint on the combination of `(user_id, post_id)`. If the backend tries to insert a duplicate, MySQL throws an `ER_DUP_ENTRY` error. The backend catches this and returns a 400 Bad Request to the user.

**Q22: What is an SQL Subquery?**
> A subquery is a query nested inside another query. In Phase 3, we used subqueries in the `SELECT` clause to calculate `like_count` and `comment_count` for each post on the fly, without needing complex `GROUP BY` clauses.

**Q23: How does the "optionalAuth" middleware work?**
> Normal authentication middleware blocks requests (returns 401) if no token is found. `optionalAuth` looks for a token; if it finds one, it verifies it and sets `req.userId`. If it doesn't find one, it simply calls `next()` without setting `req.userId` and without throwing an error. This is perfect for public feeds where we want to highlight "Liked" buttons *if* the user happens to be logged in.

### Advanced Level 🔴

**Q24: What is "Optimistic UI Updating"?**
> When a user clicks "Like", we immediately turn the heart red and increase the count by 1 in the DOM *before* the server responds. This makes the app feel instantly responsive. If the API call fails, we revert the UI back to its previous state and show an error toast.

**Q25: As the app grows, running `COUNT(*)` subqueries for every post will become slow. How would you optimize this?**
> We would denormalize the data by adding `like_count` and `comment_count` integer columns directly to the `posts` table. We would then use **Database Triggers** or application logic to increment/decrement these columns whenever a like or comment is inserted/deleted. This makes reads (fetching the feed) incredibly fast, shifting the performance cost to writes (which happen less frequently than reads).

---

# 🚀 MiniConnect Phase 4 — Follow/Unfollow Walkthrough

## Summary of Changes

Phase 4 introduces the **Follow System** to MiniConnect — users can now discover other users, visit their public profiles, and follow or unfollow them.

---

## 📚 Phase 4 Explanations

### 1. How Follow Relationships Work

Unlike a "Friend" request on Facebook which requires mutual consent (a two-way street), a "Follow" on platforms like Twitter or Instagram is a **one-way relationship** (directed graph).

User A can follow User B, but User B does not have to follow User A back.

### 2. Why `follower_id` and `following_id` Are Needed

Because the relationship is directional, we need to know *who* initiated the follow, and *who* is receiving it.

```
followers Table:
┌────┬─────────────┬──────────────┐
│ id │ follower_id │ following_id │
├────┼─────────────┼──────────────┤
│ 1  │ 3           │ 10           │  <-- User 3 follows User 10
│ 2  │ 10          │ 3            │  <-- User 10 follows User 3 (Mutual!)
│ 3  │ 1           │ 10           │  <-- User 1 follows User 10
└────┴─────────────┴──────────────┘
```

- **`follower_id`**: The person who clicked the "Follow" button.
- **`following_id`**: The person whose profile they are looking at.

If you want to know **who follows User 10** (Followers List), you search for `following_id = 10`.
If you want to know **who User 3 follows** (Following List), you search for `follower_id = 3`.

### 3. Database Design Decisions

1. **Composite Unique Key**: We added `UNIQUE KEY unique_follow (follower_id, following_id)`. This guarantees at the database engine level that User A can never follow User B twice. Even if the frontend bugs out and sends two API requests at the exact same millisecond, the database will reject the second one.
2. **ON DELETE CASCADE**: Just like posts and comments, if User A deletes their account, we automatically delete all rows where they are the `follower_id` or the `following_id`. This prevents "ghost followers".
3. **Indexes**: We added `CREATE INDEX idx_follower_id` and `idx_following_id`. This makes retrieving follower counts extremely fast because MySQL doesn't have to scan the whole table; it uses a B-Tree index.

### 4. How Counts Are Calculated

When you visit a profile (`GET /api/users/:id`), the backend runs several queries simultaneously to get the Quick Stats:

```javascript
// Example from userController.js
const [[{ posts_count }]] = await db.query('SELECT COUNT(*) AS posts_count FROM posts WHERE user_id = ?', [targetUserId]);
const [[{ followers_count }]] = await db.query('SELECT COUNT(*) AS followers_count FROM followers WHERE following_id = ?', [targetUserId]);
const [[{ following_count }]] = await db.query('SELECT COUNT(*) AS following_count FROM followers WHERE follower_id = ?', [targetUserId]);
```

We also run one specific query to check if the *current logged-in user* is already following the target user. This dictates whether the frontend should show the blue "Follow" button or the gray "Unfollow" button:

```sql
SELECT COUNT(*) AS is_following FROM followers WHERE follower_id = ? AND following_id = ?
```

---

## 5. Interview Questions — Follow System

### Intermediate Level 🟡

**Q26: What is a Directed vs. Undirected graph in the context of social networks?**
> A "Follow" model (Twitter/Instagram) is a **Directed Graph**. Connections have a direction (A -> B). A "Friend" model (Facebook) is an **Undirected Graph** where a connection is strictly mutual (A <-> B). Directed graphs require tracking the source (`follower_id`) and destination (`following_id`).

**Q27: How would you prevent a user from following themselves?**
> 1. **Frontend check**: Don't show the follow button on your own profile.
> 2. **Backend check**: In the API controller, assert `if (followerId === followingId) return res.status(400)`.
> 3. **Database check**: In modern databases, you can add a `CHECK` constraint: `CHECK (follower_id != following_id)`.

**Q28: Why do we use `COUNT(*)` instead of `COUNT(id)`?**
> `COUNT(*)` is heavily optimized in relational databases and simply counts the number of rows that match the WHERE clause. `COUNT(column_name)` checks if `column_name` is NOT NULL for every row, which can be slightly slower if the engine doesn't optimize it.

### Advanced Level 🔴

**Q29: How would you design a "News Feed" that only shows posts from people you follow?**
> We would use an `IN` clause with a subquery, or an `INNER JOIN`.
> Example using JOIN:
> ```sql
> SELECT p.*, u.name 
> FROM posts p
> JOIN followers f ON p.user_id = f.following_id
> JOIN users u ON p.user_id = u.id
> WHERE f.follower_id = ? -- (The current user's ID)
> ORDER BY p.created_at DESC
> ```
> This is a classic relational database approach to generating a tailored feed.

**Q30: How would you handle fetching followers for a celebrity with 100 million followers?**
> A simple `SELECT COUNT(*)` would become too slow. 
> 1. We would cache the follower counts in an in-memory database like **Redis**.
> 2. We would denormalize the `users` table to include a `follower_count` integer column that increments/decrements.
> 3. To view the *list* of followers, we MUST use **cursor-based pagination** (e.g., `WHERE id < last_seen_id LIMIT 20`) because offset-based pagination (`OFFSET 10000000`) would crash the database as it has to scan and discard 10 million rows before returning 20.

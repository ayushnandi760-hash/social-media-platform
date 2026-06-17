# 🌐 MiniConnect — Social Media Platform

A full-stack social media web application built with **Node.js**, **Express**, **MySQL**, and **Vanilla JavaScript**. MiniConnect allows users to register, create posts, like & comment, follow other users, and manage their profile.

---

## ✨ Features

- 🔐 **Authentication** — Register, Login & Logout with JWT-based sessions
- 📝 **Posts** — Create, view, and delete posts with optional image uploads
- ❤️ **Likes & Comments** — Like posts and leave comments in real time
- 👥 **Follow System** — Follow / unfollow other users; view followers & following lists
- 👤 **User Profiles** — View and edit your profile (name, bio, profile picture)
- 📰 **Feed** — Browse posts from users you follow
- 🖼️ **Image Uploads** — Upload profile pictures and post images via Multer

---

## 🗂️ Project Structure

```
Social Media Platform/
├── backend/
│   ├── config/             # Database connection
│   ├── controllers/        # Route logic
│   │   ├── authController.js
│   │   ├── postController.js
│   │   ├── profileController.js
│   │   └── userController.js
│   ├── middleware/         # JWT auth middleware
│   ├── routes/             # Express route definitions
│   │   ├── authRoutes.js
│   │   ├── postRoutes.js
│   │   ├── profileRoutes.js
│   │   └── userRoutes.js
│   ├── uploads/            # Uploaded images (gitignored)
│   ├── .env.example        # Environment variable template
│   ├── package.json
│   └── server.js           # Entry point
├── database/
│   └── schema.sql          # MySQL database schema
├── frontend/
│   ├── css/                # Stylesheets
│   ├── js/                 # Client-side JavaScript
│   ├── index.html          # Login page
│   ├── register.html       # Registration page
│   ├── feed.html           # Main feed
│   ├── profile.html        # User profile page
│   └── edit-profile.html   # Edit profile page
└── README.md
```

---

## 🛠️ Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | HTML5, CSS3, Vanilla JavaScript     |
| Backend    | Node.js, Express.js                 |
| Database   | MySQL                               |
| Auth       | JSON Web Tokens (JWT), bcryptjs     |
| File Upload| Multer                              |
| Dev Tool   | Nodemon                             |

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MySQL](https://www.mysql.com/) (v8 or higher)
- npm (comes with Node.js)

---

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/social-media-platform.git
cd social-media-platform
```

---

### 2. Set Up the Database

Open MySQL and run the schema file:

```bash
mysql -u root -p < database/schema.sql
```

This will create the `miniconnect` database with all required tables:
- `users`
- `posts`
- `likes`
- `comments`
- `followers`

---

### 3. Configure Environment Variables

Navigate to the backend folder and create your `.env` file:

```bash
cd backend
cp .env.example .env
```

Then open `.env` and fill in your values:

```env
PORT=5000

DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=miniconnect

JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d
```

---

### 4. Install Dependencies

```bash
cd backend
npm install
```

---

### 5. Run the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start at: **http://localhost:5000**

---

### 6. Open the Frontend

Simply open `frontend/index.html` in your browser, or use a live server extension (e.g., VS Code Live Server).

---

## 📡 API Endpoints

### Auth
| Method | Endpoint              | Description         | Auth Required |
|--------|-----------------------|---------------------|---------------|
| POST   | `/api/auth/register`  | Register a new user | ❌            |
| POST   | `/api/auth/login`     | Login & get token   | ❌            |

### Posts
| Method | Endpoint              | Description              | Auth Required |
|--------|-----------------------|--------------------------|---------------|
| GET    | `/api/posts/feed`     | Get feed posts           | ✅            |
| POST   | `/api/posts`          | Create a new post        | ✅            |
| DELETE | `/api/posts/:id`      | Delete a post            | ✅            |
| POST   | `/api/posts/:id/like` | Like / unlike a post     | ✅            |
| POST   | `/api/posts/:id/comment` | Add a comment         | ✅            |

### Profile
| Method | Endpoint                  | Description              | Auth Required |
|--------|---------------------------|--------------------------|---------------|
| GET    | `/api/profile/:id`        | Get user profile         | ✅            |
| PUT    | `/api/profile/update`     | Update profile info      | ✅            |
| POST   | `/api/profile/upload-pic` | Upload profile picture   | ✅            |

### Users
| Method | Endpoint                    | Description              | Auth Required |
|--------|-----------------------------|--------------------------|---------------|
| GET    | `/api/users/search`         | Search users             | ✅            |
| POST   | `/api/users/:id/follow`     | Follow a user            | ✅            |
| DELETE | `/api/users/:id/follow`     | Unfollow a user          | ✅            |
| GET    | `/api/users/:id/followers`  | Get followers list       | ✅            |
| GET    | `/api/users/:id/following`  | Get following list       | ✅            |

---

## 🗄️ Database Schema

```
users ──< posts ──< likes
  │               └──< comments
  └──< followers
```

- A **user** can have many **posts**
- A **post** can have many **likes** and **comments**
- A **user** can follow many **users** (self-referencing via `followers` table)

---

## 🔒 Security

- Passwords are hashed using **bcryptjs** before storing
- All protected routes require a valid **JWT token** in the `Authorization` header
- `.env` file is excluded from version control via `.gitignore`

---



## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

Made with ❤️ by **Ayush Nandi**

> ⭐ If you found this project helpful, please give it a star!

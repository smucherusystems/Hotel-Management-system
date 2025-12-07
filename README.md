# Hotel Booking System

A simple hotel booking web app (Node.js/Express backend + vanilla JS frontend).

## Quick overview

- Backend: Node.js + Express (in `Backend/`) talking to MySQL.
- Frontend: Static files in `Frontend/` (open `Index.html` or serve with a static server).
- Database: SQL files live in `Backend/database/` and the root `database/` folder.

## Quickstart (development)

1. Backend
   - Open a terminal and navigate to `Backend`:
     ```powershell
     cd "c:\Users\Administrator\Desktop\db\Hotel Booking System\Backend"
     ```
   - Create/update `hotel.env` with your DB credentials (example keys below):
     ```text
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_mysql_password
     DB_NAME=luxury_hotel
     PORT=3000
     JWT_SECRET=your_secret_key
     NODE_ENV=development
     ```
   - Install dependencies and start the server:
     ```powershell
     npm install
     npm start
     # or for dev with nodemon (if configured): npm run dev
     ```
   - Server will listen on the port from `hotel.env` (default: 3000).

2. Frontend
   - Open `Frontend\Index.html` directly in your browser for quick testing, or serve the `Frontend` folder with a simple HTTP server to avoid CORS issues:
     ```powershell
     cd "c:\Users\Administrator\Desktop\db\Hotel Booking System\Frontend"
     # With Python 3
     python -m http.server 8080
     # Or using http-server (Node): npm install -g http-server; http-server -p 8080
     ```
   - Open `http://localhost:8080` (if served) or open the file directly.

3. Database
   - Create the database and run the SQL in `Backend/database/database.sql` or `database/database.sql` to create tables and sample data.

## Git: prepare and push changes

Use these commands in PowerShell from the project root to commit and push your changes to the `main` branch:

```powershell
cd "c:\Users\Administrator\Desktop\db\Hotel Booking System"
# Check status
git status
# Stage your changes
git add README.md
# Commit with a helpful message
git commit -m "docs: update README for pushing"
# Push to the main branch
git push origin main
```

If your local repo has no remote yet, add it first (replace <remote-url>):

```powershell
git remote add origin <remote-url>
git push -u origin main
```

Notes:
- Use descriptive commit messages. If you need to include other changed files, `git add .` will stage all modified files.
- If the push is rejected, you may need to pull and rebase first: `git pull --rebase origin main` then push again.

## What changed in this README

- Shortened and focused instructions for local dev and pushing changes.
- Included PowerShell-friendly commands for Windows environment.

## Troubleshooting

- Backend cannot connect to MySQL: verify `hotel.env` credentials, ensure MySQL is running and reachable.
- Frontend CORS issues: serve the static `Frontend` folder via a simple HTTP server as shown above.

---

If you want, I can also: 
- Add a minimal `CONTRIBUTING.md` with commit message conventions, or
- Create a small script in `package.json` to run the frontend and backend together.


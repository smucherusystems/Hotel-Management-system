# Hotel Booking System

A comprehensive hotel management system with room booking, service ordering, caching layers, and admin management.

## 🔍 Quick Overview
- **Backend**: Node.js + Express (`Backend/`)
- **Frontend**: Responsive web interface (`Frontend/`)
- **Databases & Caching**:
  - **MySQL** – Primary persistent database
  - **In-Memory Cache (L1)** – Fast runtime cache (JS Map)
  - **Redis Cache (L2)** – Distributed cache (optional but recommended)
- **Authentication**: JWT-based authentication
- **Architecture**: Cache-first (L1 → L2 → MySQL)
- **Features**:
  - Room booking & availability
  - Customer & booking management
  - Meal & spa service ordering
  - Admin dashboard & analytics
  - High-performance caching strategy

## 🧠 System Architecture (With Caching)
```
Client
  ↓
API (Express)
  ↓
L1 Cache (In-Memory)
  ↓ (cache miss)
L2 Cache (Redis)
  ↓ (cache miss)
MySQL Database
```

### Cache Strategy
- **L1 (In-Memory)**: Ultra-fast, per-server, volatile
- **L2 (Redis)**: Shared, persistent across restarts
- **MySQL**: Source of truth

## 📁 Project Structure
```
Hotel Booking System/
├── Backend/
│   ├── server.js
│   ├── cache/
│   │   ├── memoryStore.js     # L1 in-memory cache
│   │   └── redisClient.js     # L2 Redis client
│   ├── database/
│   │   └── database.sql
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   ├── hotel.env
│   └── package.json
│
├── Frontend/
│   └── index.html
│
└── README.md
```

## ⚙️ Technologies Used
| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express |
| **Auth** | JWT |
| **Database** | MySQL |
| **L1 Cache** | JavaScript In-Memory (Map) |
| **L2 Cache** | Redis |
| **Frontend** | HTML, CSS, JavaScript |

## 🚀 Quickstart (Development)

### 1️⃣ Backend Setup
```powershell
cd "c:\Users\Administrator\Desktop\db\Hotel Booking System\Backend"
```

Create or update `hotel.env`:
```env
# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=luxury_hotel

# Server
PORT=3000
NODE_ENV=development

# Auth
JWT_SECRET=your_secret_key

# Redis (optional but recommended)
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_ENABLED=true
```

Install dependencies and start server:
```bash
npm install
npm start
# or
npm run dev
```

Server runs on: http://localhost:3000

### 2️⃣ Frontend Setup
```powershell
cd "c:\Users\Administrator\Desktop\db\Hotel Booking System\Frontend"
```

Serve frontend (recommended to avoid CORS):
```bash
python -m http.server 8080
```

Open: http://localhost:8080

### 3️⃣ Database Setup (MySQL)
1. Install MySQL
2. Create database:
   ```sql
   CREATE DATABASE luxury_hotel;
   ```
3. Import schema:
   ```bash
   mysql -u root -p luxury_hotel < Backend/database/database.sql
   ```
4. App auto-creates missing tables if needed

## 🧠 Caching Layers Explained

### 🔹 L1 Cache – In-Memory
- Uses JavaScript Map
- Extremely fast
- Cleared on server restart
- Used for:
  - Rooms
  - Availability checks
  - Meals
  - Spa services
  - Dashboard stats

### 🔹 L2 Cache – Redis
- Shared across servers
- Survives restarts
- Optional but recommended
- Used for:
  - Frequently accessed read data
  - High-traffic endpoints
  - Admin dashboard

### 🔹 Cache Priority
L1 → L2 → MySQL

## 🧩 Example Cache Flow (Rooms)
```javascript
// 1. Check memory cache
// 2. If miss → check Redis
// 3. If miss → fetch MySQL
// 4. Save to Redis + Memory
```

## 🔥 Cached Endpoints
| Endpoint | Cache |
|----------|-------|
| `GET /api/rooms` | L1 + Redis |
| `GET /api/rooms/availability` | L1 + Redis |
| `GET /api/meals` | L1 + Redis |
| `GET /api/spa/services` | L1 + Redis |
| `GET /api/admin/dashboard` | Redis (short TTL) |

**Cache Invalidation Happens On:**
- Booking creation / cancellation
- Room updates
- Meal or spa updates
- Admin actions

## 🔐 Authentication
- JWT-based authentication
- Token expiry: 7 days
- Protected routes:
  - `/api/auth/me`
  - `/api/admin/*`

## ⚠️ Important Notes
- MySQL is the single source of truth
- Never cache:
  - Passwords
  - JWT tokens
  - Sensitive user data
- Redis can be disabled by setting:
  ```env
  REDIS_ENABLED=false
  ```

## 🐛 Troubleshooting

### Backend Cannot Connect to MySQL
- Check `hotel.env`
- Ensure MySQL is running
- Verify port 3306

### Redis Not Working
- Ensure Redis server is running
- Set `REDIS_ENABLED=true`
- If Redis fails, system auto-falls back to L1 + MySQL

### Stale Data
- Ensure cache invalidation is triggered
- Reduce Redis TTL if needed

## 🚀 Performance Benefits
| Feature | Without Cache | With Cache |
|---------|--------------|------------|
| Room listing | Slow | ⚡ Instant |
| Availability check | Heavy DB load | 🚀 Cached |
| Dashboard | Multiple queries | 🧠 Cached stats |

## 🔐 Security Considerations
- Change `JWT_SECRET` in production
- Use HTTPS
- Secure Redis with password
- Restrict Redis to private network
- Validate all inputs

## 🧭 Future Enhancements
- Redis TTL fine-tuning
- Cache warming on startup
- Redis pub/sub for multi-server sync
- Read replicas
- Rate limiting

## 📞 Support & Development Tips
- Use Postman / Thunder Client for API testing
- Enable MySQL logs for debugging
- Monitor Redis memory usage
- Restart server to clear L1 cache


## Troubleshooting

- Backend cannot connect to MySQL: verify `hotel.env` credentials, ensure MySQL is running and reachable.
- Frontend CORS issues: serve the static `Frontend` folder via a simple HTTP server as shown above.
# Backend API Documentation

## Luxury Hotel Management System - Backend

Complete documentation for the Hotel Management System backend API.

---

## 📋 Table of Contents

1. [Project Structure](#project-structure)
2. [Getting Started](#getting-started)
3. [Environment Variables](#environment-variables)
4. [Database Schema](#database-schema)
5. [API Endpoints](#api-endpoints)
6. [Authentication](#authentication)
7. [Error Handling](#error-handling)
8. [Frontend Integration](#frontend-integration)
9. [Common Errors & Troubleshooting](#common-errors--troubleshooting)

---

## 📁 Project Structure

```
Backend/
├── server.js              # Main Express server and API routes
├── package.json           # Node.js dependencies
├── hotel.env              # Environment variables
├── database/
│   └── migrations.sql    # Database migration script
└── backend_documentation.md  # This file
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

### Installation

1. **Navigate to Backend directory:**
   ```bash
   cd Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   - Edit `hotel.env` with your database credentials
   - See [Environment Variables](#environment-variables) section

4. **Run database migrations:**
   ```bash
   mysql -u root -p luxury_hotel < database/migrations.sql
   ```

5. **Start the server:**
   ```bash
   npm start
   ```
   
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

The server will start on `http://localhost:3000` (or the port specified in `hotel.env`).

---

## ⚙️ Environment Variables

Create/update `Backend/hotel.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=luxury_hotel

# JWT Secret (change in production!)
JWT_SECRET=your_secret_key_here

# Server Configuration
PORT=3000
NODE_ENV=development
```

**Important:** Never commit `.env` files to version control!

---

## 🗄️ Database Schema

### Core Tables

#### `rooms`
Stores hotel room information.

| Column | Type | Description |
|-------|------|-------------|
| id | INT | Primary key |
| room_number | VARCHAR(10) | Unique room identifier |
| room_type | VARCHAR(50) | Room type (Deluxe, Executive, etc.) |
| price | DECIMAL(10,2) | Price per night |
| max_occupancy | INT | Maximum guests |
| description | TEXT | Room description |
| features | JSON | Array of room features |
| image_url | VARCHAR(500) | Room image URL |
| status | ENUM | available, occupied, maintenance |

#### `bookings`
Stores room reservations.

| Column | Type | Description |
|-------|------|-------------|
| id | INT | Primary key |
| booking_reference | VARCHAR(20) | Unique booking reference (BK...) |
| room_id | INT | Foreign key to rooms |
| customer_name | VARCHAR(100) | Guest full name |
| customer_email | VARCHAR(100) | Guest email |
| customer_phone | VARCHAR(20) | Guest phone |
| id_number | VARCHAR(50) | ID/Passport number |
| check_in | DATE | Check-in date |
| check_out | DATE | Check-out date |
| guests | INT | Number of guests |
| total_amount | DECIMAL(10,2) | Total booking cost |
| payment_method | ENUM | cash, card, mpesa |
| discount_code | VARCHAR(50) | Optional discount code |
| special_requests | TEXT | Special requests/notes |
| status | ENUM | pending, confirmed, checked_in, checked_out, cancelled |

#### `meals`
Stores restaurant menu items.

| Column | Type | Description |
|-------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(100) | Meal name |
| description | TEXT | Meal description |
| category | VARCHAR(50) | Category (Main Course, Salad, etc.) |
| price | DECIMAL(10,2) | Price |
| image_url | VARCHAR(500) | Image URL |
| is_available | BOOLEAN | Availability status |

#### `meal_orders`
Stores food/drink orders.

| Column | Type | Description |
|-------|------|-------------|
| id | INT | Primary key |
| booking_id | INT | Optional foreign key to bookings |
| customer_name | VARCHAR(100) | Customer name |
| room_number | VARCHAR(10) | Room number |
| order_type | ENUM | restaurant, room_service |
| total_amount | DECIMAL(10,2) | Total order cost |
| special_instructions | TEXT | Special instructions |
| status | ENUM | pending, preparing, ready, delivered, cancelled |

#### `order_items`
Stores individual items in an order.

| Column | Type | Description |
|-------|------|-------------|
| id | INT | Primary key |
| order_id | INT | Foreign key to meal_orders |
| meal_id | INT | Foreign key to meals (nullable for bar/cafe items) |
| quantity | INT | Item quantity |
| price | DECIMAL(10,2) | Item price at time of order |

#### `spa_services`
Stores spa treatment information.

| Column | Type | Description |
|-------|------|-------------|
| id | INT | Primary key |
| name | VARCHAR(100) | Service name |
| description | TEXT | Service description |
| category | VARCHAR(50) | Service category |
| price | DECIMAL(10,2) | Service price |
| duration_minutes | INT | Duration in minutes |
| image_url | VARCHAR(500) | Image URL |
| is_available | BOOLEAN | Availability status |

#### `spa_appointments`
Stores spa bookings.

| Column | Type | Description |
|-------|------|-------------|
| id | INT | Primary key |
| booking_id | INT | Optional foreign key to bookings |
| customer_name | VARCHAR(100) | Customer name |
| service_id | INT | Foreign key to spa_services |
| appointment_date | DATE | Appointment date |
| appointment_time | TIME | Appointment time |
| notes | TEXT | Special notes |
| status | ENUM | scheduled, completed, cancelled |

#### `users`
Stores user accounts (for authentication).

| Column | Type | Description |
|-------|------|-------------|
| id | INT | Primary key |
| username | VARCHAR(50) | Unique username |
| email | VARCHAR(100) | Unique email |
| password_hash | VARCHAR(255) | Bcrypt hashed password |
| full_name | VARCHAR(100) | User full name |
| phone | VARCHAR(20) | Phone number |
| role | ENUM | guest, staff, admin |
| is_active | BOOLEAN | Account status |

---

## 🔌 API Endpoints

### Base URL
```
http://localhost:3000/api
```

### Response Format

All responses follow this structure:

**Success:**
```json
{
  "success": true,
  "data": {...},
  "message": "Optional message"
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  "errors": ["Array of validation errors (if applicable)"]
}
```

---

### 🏨 Rooms

#### `GET /api/rooms`
Get all rooms with real-time availability status.

**Response:**
```json
[
  {
    "id": 1,
    "room_number": "101",
    "room_type": "Deluxe",
    "price": 299.00,
    "max_occupancy": 2,
    "description": "Spacious room...",
    "features": ["Free WiFi", "Smart TV", "Coffee Maker"],
    "image_url": "https://...",
    "status": "available",
    "current_status": "available"
  }
]
```

#### `GET /api/rooms/availability`
Check room availability for specific dates.

**Query Parameters:**
- `check_in` (required): YYYY-MM-DD
- `check_out` (required): YYYY-MM-DD
- `room_type` (optional): Filter by room type

**Example:**
```
GET /api/rooms/availability?check_in=2024-01-15&check_out=2024-01-20&room_type=Deluxe
```

**Response:**
```json
[
  {
    "id": 1,
    "room_number": "101",
    "room_type": "Deluxe",
    "price": 299.00,
    "features": [...]
  }
]
```

---

### 📅 Bookings

#### `POST /api/book-room`
Create a new room booking (enhanced endpoint).

**Request Body:**
```json
{
  "room_id": 1,
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "id_number": "P12345678",
  "check_in": "2024-01-15",
  "check_out": "2024-01-20",
  "guests": 2,
  "room_type": "Deluxe",
  "payment_method": "card",
  "discount_code": "SUMMER10",
  "total_amount": 1495.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "booking_id": 123,
  "booking_reference": "BK12345678",
  "total_amount": 1345.50,
  "nights": 5,
  "check_in": "2024-01-15",
  "check_out": "2024-01-20"
}
```

**Validation:**
- All fields are required except `discount_code`
- Email must be valid format
- Phone must be valid (minimum 10 digits)
- Check-in date cannot be in the past
- Check-out must be after check-in
- Guests must be 1-8
- Payment method must be: cash, card, or mpesa

#### `POST /api/bookings`
Legacy booking endpoint (maintained for backward compatibility).

**Request Body:**
```json
{
  "room_id": 1,
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+1234567890",
  "check_in": "2024-01-15",
  "check_out": "2024-01-20",
  "guests": 2,
  "total_amount": 1495.00,
  "special_requests": "Late check-in requested"
}
```

#### `GET /api/bookings`
Get all bookings with optional filters.

**Query Parameters:**
- `status` (optional): Filter by status
- `customer_email` (optional): Filter by email
- `booking_reference` (optional): Filter by reference

**Example:**
```
GET /api/bookings?status=confirmed&customer_email=john@example.com
```

#### `GET /api/bookings/active`
Get active bookings (for room service).

**Response:**
```json
[
  {
    "id": 123,
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "check_in": "2024-01-15",
    "check_out": "2024-01-20",
    "booking_reference": "BK12345678",
    "room_number": "101",
    "room_type": "Deluxe"
  }
]
```

#### `GET /api/bookings/:id`
Get booking details by ID.

**Response:**
```json
{
  "success": true,
  "booking": {
    "id": 123,
    "booking_reference": "BK12345678",
    "room_id": 1,
    "customer_name": "John Doe",
    ...
  }
}
```

---

### 🍽️ Meals & Orders

#### `GET /api/meals`
Get all available meals.

**Query Parameters:**
- `category` (optional): Filter by category

**Example:**
```
GET /api/meals?category=Main Course
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Grilled Salmon",
    "description": "Fresh Atlantic salmon...",
    "category": "Main Course",
    "price": 32.00,
    "image_url": "https://...",
    "is_available": true
  }
]
```

#### `GET /api/meals/category/:category`
Get meals by specific category.

**Example:**
```
GET /api/meals/category/Salad
```

#### `POST /api/meal-orders`
Create a meal order.

**Request Body:**
```json
{
  "booking_id": 123,
  "customer_name": "John Doe",
  "room_number": "101",
  "order_type": "room_service",
  "items": [
    {
      "meal_id": 1,
      "quantity": 2,
      "price": 32.00
    },
    {
      "meal_id": "bar_0",
      "quantity": 1,
      "price": 18.00
    }
  ],
  "special_instructions": "No onions, please"
}
```

**Note:** Bar/cafe items may have string IDs (e.g., "bar_0", "cafe_1") and should include price in the request.

**Response:**
```json
{
  "success": true,
  "message": "Meal order created successfully",
  "order_id": 456,
  "total_amount": 82.00,
  "items_count": 2,
  "order_type": "room_service",
  "status": "pending"
}
```

#### `GET /api/orders`
Get all meal orders with optional filters.

**Query Parameters:**
- `status` (optional): Filter by status
- `customer_name` (optional): Filter by customer name
- `order_type` (optional): restaurant or room_service

**Example:**
```
GET /api/orders?status=pending&order_type=room_service
```

#### `GET /api/orders/:id`
Get order details by ID.

**Response:**
```json
{
  "id": 456,
  "customer_name": "John Doe",
  "room_number": "101",
  "order_type": "room_service",
  "total_amount": 82.00,
  "status": "pending",
  "items": [
    {
      "id": 1,
      "meal_id": 1,
      "quantity": 2,
      "price": 32.00,
      "meal_name": "Grilled Salmon"
    }
  ]
}
```

---

### 💆 Spa Services

#### `GET /api/spa/services`
Get all available spa services.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Signature Massage",
    "description": "Swedish and deep tissue...",
    "category": "Massage",
    "price": 120.00,
    "duration_minutes": 60,
    "image_url": "https://...",
    "is_available": true
  }
]
```

#### `GET /api/spa/hours`
Get spa operating hours.

**Response:**
```json
[
  {
    "day_of_week": "Monday",
    "is_open": true,
    "open_time": "09:00:00",
    "close_time": "20:00:00"
  }
]
```

#### `POST /api/spa-appointments`
Book a spa appointment.

**Request Body:**
```json
{
  "booking_id": 123,
  "customer_name": "John Doe",
  "service_id": 1,
  "appointment_date": "2024-01-18",
  "appointment_time": "14:00:00",
  "notes": "Prefer female therapist"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Spa appointment created successfully",
  "appointment_id": 789
}
```

---

### 🔐 Authentication

#### `POST /api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword123",
  "full_name": "John Doe",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "role": "guest"
  }
}
```

#### `POST /api/auth/login`
Login with username/email and password.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "role": "guest"
  }
}
```

#### `GET /api/auth/me`
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "john@example.com",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "role": "guest"
  }
}
```

---

### 👨‍💼 Admin

#### `GET /api/admin/dashboard`
Get dashboard statistics (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available_rooms": 15,
    "occupied_rooms": 5,
    "confirmed_bookings": 12,
    "checked_in_guests": 3,
    "pending_orders": 8,
    "spa_appointments": 5
  }
}
```

---

## 🔒 Authentication

### How It Works

1. **Register/Login:** User sends credentials to `/api/auth/register` or `/api/auth/login`
2. **Receive Token:** Server returns a JWT token
3. **Use Token:** Include token in Authorization header for protected routes:
   ```
   Authorization: Bearer <token>
   ```
4. **Token Expiry:** Tokens expire after 7 days

### Protected Routes

Routes that require authentication:
- `GET /api/auth/me`
- `GET /api/admin/dashboard`

### Authentication Middleware

The `authenticateToken` middleware validates JWT tokens:

```javascript
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.sendStatus(401);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};
```

---

## ⚠️ Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (invalid token)
- `404` - Not Found
- `500` - Internal Server Error

### Error Response Format

```json
{
  "success": false,
  "error": "Error message",
  "errors": ["Detailed validation errors (if applicable)"]
}
```

### Common Error Scenarios

1. **Validation Errors (400):**
   ```json
   {
     "success": false,
     "error": "Validation failed",
     "errors": [
       "Valid email address is required",
       "Check-out date must be after check-in date"
     ]
   }
   ```

2. **Not Found (404):**
   ```json
   {
     "success": false,
     "error": "Booking not found"
   }
   ```

3. **Server Error (500):**
   ```json
   {
     "success": false,
     "error": "Database error"
   }
   ```

---

## 🌐 Frontend Integration

### API Base URL

The frontend uses:
```javascript
const API_BASE = 'http://localhost:3000/api';
```

### CORS Configuration

The backend allows all origins (configured for development):
```javascript
app.use(cors());
```

For production, configure specific origins:
```javascript
app.use(cors({
    origin: 'https://yourdomain.com',
    credentials: true
}));
```

### Frontend API Calls

#### Example: Booking a Room

```javascript
const response = await fetch(`${API_BASE}/book-room`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        room_id: 1,
        customer_name: "John Doe",
        customer_email: "john@example.com",
        customer_phone: "+1234567890",
        id_number: "P12345678",
        check_in: "2024-01-15",
        check_out: "2024-01-20",
        guests: 2,
        room_type: "Deluxe",
        payment_method: "card",
        discount_code: "SUMMER10",
        total_amount: 1495.00
    })
});

const result = await response.json();

if (result.success) {
    console.log('Booking ID:', result.booking_id);
    console.log('Reference:', result.booking_reference);
} else {
    console.error('Error:', result.error);
}
```

#### Example: Placing an Order

```javascript
const response = await fetch(`${API_BASE}/meal-orders`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        booking_id: 123,
        customer_name: "John Doe",
        room_number: "101",
        order_type: "room_service",
        items: [
            {
                meal_id: 1,
                quantity: 2,
                price: 32.00
            }
        ],
        special_instructions: "No onions"
    })
});
```

---

## 🐛 Common Errors & Troubleshooting

### Database Connection Errors

**Error:** `Database connection failed`

**Solutions:**
1. Verify MySQL is running: `mysql -u root -p`
2. Check credentials in `hotel.env`
3. Ensure database exists: `CREATE DATABASE luxury_hotel;`
4. Verify MySQL port (default: 3306)

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solutions:**
1. Change PORT in `hotel.env`
2. Kill process using port 3000:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -ti:3000 | xargs kill
   ```

### Missing Database Columns

**Error:** `Unknown column 'id_number' in 'field list'`

**Solution:** Run database migrations:
```bash
mysql -u root -p luxury_hotel < Backend/database/migrations.sql
```

### CORS Errors

**Error:** `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**Solution:** Ensure CORS middleware is enabled in `server.js`:
```javascript
app.use(cors());
```

### Invalid JSON Responses

**Error:** Frontend receives HTML instead of JSON

**Solution:** 
1. Check API endpoint URL is correct
2. Verify Content-Type header: `application/json`
3. Ensure error handler is properly configured

### Transaction Errors

**Error:** `Transaction error` or `Commit error`

**Solutions:**
1. Check database connection is stable
2. Verify all foreign key constraints exist
3. Ensure tables have proper indexes
4. Check for deadlocks in MySQL logs

### Validation Errors

**Error:** `Validation failed` with multiple errors

**Solution:** Check request body matches expected format:
- All required fields present
- Data types correct (dates, numbers, etc.)
- Email/phone formats valid
- Date ranges logical

---

## 📝 Code Examples

### Complete Booking Flow

```javascript
// 1. Check availability
const availability = await fetch(
    `${API_BASE}/rooms/availability?check_in=2024-01-15&check_out=2024-01-20&room_type=Deluxe`
);
const availableRooms = await availability.json();

// 2. Create booking
const booking = await fetch(`${API_BASE}/book-room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        room_id: availableRooms[0].id,
        customer_name: "John Doe",
        customer_email: "john@example.com",
        customer_phone: "+1234567890",
        id_number: "P12345678",
        check_in: "2024-01-15",
        check_out: "2024-01-20",
        guests: 2,
        room_type: "Deluxe",
        payment_method: "card",
        total_amount: 1495.00
    })
});
const bookingResult = await booking.json();

// 3. Place order (if needed)
if (bookingResult.success) {
    const order = await fetch(`${API_BASE}/meal-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            booking_id: bookingResult.booking_id,
            customer_name: "John Doe",
            room_number: "101",
            order_type: "room_service",
            items: [{ meal_id: 1, quantity: 1, price: 32.00 }]
        })
    });
}
```

---

## 🔧 Development Tips

### Testing Endpoints

Use tools like:
- **Postman** - GUI API testing
- **curl** - Command line testing
- **Thunder Client** - VS Code extension

**Example curl command:**
```bash
curl -X POST http://localhost:3000/api/book-room \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": 1,
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "+1234567890",
    "id_number": "P12345678",
    "check_in": "2024-01-15",
    "check_out": "2024-01-20",
    "guests": 2,
    "room_type": "Deluxe",
    "payment_method": "card",
    "total_amount": 1495.00
  }'
```

### Logging

The server logs all requests:
```
2024-01-10T10:30:45.123Z - POST /api/book-room
2024-01-10T10:30:45.456Z - GET /api/rooms
```

### Database Queries

Enable MySQL query logging for debugging:
```sql
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'table';
SELECT * FROM mysql.general_log;
```

---

## 🚨 Security Considerations

1. **Change JWT_SECRET** in production
2. **Use HTTPS** in production
3. **Validate all inputs** (already implemented)
4. **Rate limiting** - Consider adding for production
5. **SQL Injection** - Using parameterized queries (already implemented)
6. **Password Hashing** - Using bcrypt (already implemented)
7. **Environment Variables** - Never commit `.env` files

---

## 📞 Support

For issues or questions:
1. Check error logs in console
2. Verify database connection
3. Review this documentation
4. Check API endpoint URLs match frontend

---

**Last Updated:** 2024
**Version:** 1.0.0


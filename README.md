# Luxury Hotel Booking System

A comprehensive hotel management system with room booking, dining services, spa appointments, and more. Built with Node.js/Express backend and vanilla JavaScript frontend.

## 📋 Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

## ✨ Features

- **Room Management**: Browse and book various room types (Deluxe, Executive, Presidential, Junior Suite, Family Suite, Ocean View, Penthouse, Standard)
- **Advanced Booking System**: Check availability with date range, room type, guest count, and price filters
- **Dining Services**: 
  - Restaurant menu with meal ordering
  - Bar menu with cocktails, wines, beers, and spirits
  - Café menu with breakfast, sandwiches, salads, and beverages
- **Spa Services**: Book spa treatments and view spa hours
- **Modern UI**: Responsive design with smooth animations and modal dialogs
- **Real-time Availability**: Dynamic room status checking based on bookings

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MySQL** (v8.0 or higher) - [Download](https://dev.mysql.com/downloads/)
- **npm** (comes with Node.js) or **yarn**
- A modern web browser (Chrome, Firefox, Edge, Safari)

## 📁 Project Structure

```
Hotel Booking System/
├── Backend/
│   ├── server.js          # Express server and API routes
│   ├── package.json       # Backend dependencies
│   ├── hotel.env          # Environment variables (database config)
│   └── node_modules/      # Backend dependencies (auto-generated)
│
├── Frontend/
│   ├── Index.html         # Main HTML file
│   ├── css/
│   │   └── style.css      # All CSS styles
│   └── js/
│       └── script.js      # All JavaScript functionality
│
└── README.md              # This file
```

## 🚀 Installation & Setup

### Step 1: Clone or Download the Project

If you have the project files, navigate to the project directory:

```bash
cd "Hotel Booking System"
```

### Step 2: Database Setup

1. **Start MySQL Server**
   - Make sure MySQL is running on your system
   - Open MySQL Command Line Client or MySQL Workbench

2. **Create the Database**
   ```sql
   CREATE DATABASE luxury_hotel;
   ```

3. **Create Required Tables**
   
   Run the following SQL commands to create the necessary tables:

   ```sql
   USE luxury_hotel;

   -- Rooms table
   CREATE TABLE rooms (
       id INT AUTO_INCREMENT PRIMARY KEY,
       room_number VARCHAR(10) UNIQUE NOT NULL,
       room_type VARCHAR(50) NOT NULL,
       price DECIMAL(10, 2) NOT NULL,
       max_occupancy INT NOT NULL DEFAULT 2,
       description TEXT,
       features JSON,
       image_url VARCHAR(500),
       status ENUM('available', 'occupied', 'maintenance') DEFAULT 'available',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Bookings table
   CREATE TABLE bookings (
       id INT AUTO_INCREMENT PRIMARY KEY,
       room_id INT NOT NULL,
       customer_name VARCHAR(100) NOT NULL,
       customer_email VARCHAR(100) NOT NULL,
       customer_phone VARCHAR(20),
       check_in DATE NOT NULL,
       check_out DATE NOT NULL,
       guests INT NOT NULL DEFAULT 1,
       total_amount DECIMAL(10, 2) NOT NULL,
       special_requests TEXT,
       status ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled') DEFAULT 'confirmed',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
   );

   -- Meals table
   CREATE TABLE meals (
       id INT AUTO_INCREMENT PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       description TEXT,
       category VARCHAR(50) NOT NULL,
       price DECIMAL(10, 2) NOT NULL,
       image_url VARCHAR(500),
       is_available BOOLEAN DEFAULT TRUE,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Meal orders table
   CREATE TABLE meal_orders (
       id INT AUTO_INCREMENT PRIMARY KEY,
       booking_id INT,
       customer_name VARCHAR(100) NOT NULL,
       room_number VARCHAR(10),
       order_type ENUM('restaurant', 'room_service') NOT NULL,
       total_amount DECIMAL(10, 2) NOT NULL,
       special_instructions TEXT,
       status ENUM('pending', 'preparing', 'ready', 'delivered', 'cancelled') DEFAULT 'pending',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
   );

   -- Order items table
   CREATE TABLE order_items (
       id INT AUTO_INCREMENT PRIMARY KEY,
       order_id INT NOT NULL,
       meal_id INT NOT NULL,
       quantity INT NOT NULL DEFAULT 1,
       price DECIMAL(10, 2) NOT NULL,
       FOREIGN KEY (order_id) REFERENCES meal_orders(id) ON DELETE CASCADE,
       FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
   );

   -- Spa services table
   CREATE TABLE spa_services (
       id INT AUTO_INCREMENT PRIMARY KEY,
       name VARCHAR(100) NOT NULL,
       description TEXT,
       category VARCHAR(50),
       price DECIMAL(10, 2) NOT NULL,
       duration_minutes INT NOT NULL,
       image_url VARCHAR(500),
       is_available BOOLEAN DEFAULT TRUE,
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   -- Spa appointments table
   CREATE TABLE spa_appointments (
       id INT AUTO_INCREMENT PRIMARY KEY,
       booking_id INT,
       customer_name VARCHAR(100) NOT NULL,
       service_id INT NOT NULL,
       appointment_date DATE NOT NULL,
       appointment_time TIME NOT NULL,
       notes TEXT,
       status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
       FOREIGN KEY (service_id) REFERENCES spa_services(id) ON DELETE CASCADE
   );

   -- Spa hours table
   CREATE TABLE spa_hours (
       id INT AUTO_INCREMENT PRIMARY KEY,
       day_of_week VARCHAR(20) NOT NULL,
       is_open BOOLEAN DEFAULT TRUE,
       open_time TIME,
       close_time TIME,
       UNIQUE KEY unique_day (day_of_week)
   );

   -- Insert sample spa hours
   INSERT INTO spa_hours (day_of_week, is_open, open_time, close_time) VALUES
   ('Monday', TRUE, '09:00:00', '20:00:00'),
   ('Tuesday', TRUE, '09:00:00', '20:00:00'),
   ('Wednesday', TRUE, '09:00:00', '20:00:00'),
   ('Thursday', TRUE, '09:00:00', '20:00:00'),
   ('Friday', TRUE, '09:00:00', '21:00:00'),
   ('Saturday', TRUE, '10:00:00', '21:00:00'),
   ('Sunday', TRUE, '10:00:00', '18:00:00');
   ```

4. **Insert Sample Data (Optional)**
   
   You can insert sample rooms, meals, and spa services for testing:

   ```sql
   -- Sample rooms
   INSERT INTO rooms (room_number, room_type, price, max_occupancy, description, features, image_url) VALUES
   ('101', 'Deluxe', 299.00, 2, 'Spacious and elegantly appointed room with a king-size bed', '["Free WiFi", "Smart TV", "Coffee Maker", "Air Conditioning"]', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'),
   ('201', 'Executive', 499.00, 3, 'Luxurious suite with separate living area', '["Free WiFi", "Smart TV", "Jacuzzi", "Mini Bar"]', 'https://images.unsplash.com/photo-1586105251261-72a756497a11?ixlib=rb-4.0.3&auto=format&fit=crop&w=2058&q=80'),
   ('301', 'Presidential', 899.00, 4, 'Our most luxurious accommodation with private terrace', '["Free WiFi", "Smart TV", "Private Jacuzzi", "Butler Service"]', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80'),
   ('102', 'Junior Suite', 399.00, 2, 'Elegant suite with sitting area', '["Free WiFi", "Smart TV", "Mini Bar", "City View"]', 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'),
   ('202', 'Family Suite', 599.00, 4, 'Perfect for families with connecting rooms', '["Free WiFi", "Smart TV", "Kitchenette", "Extra Beds"]', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80'),
   ('401', 'Ocean View', 449.00, 2, 'Stunning ocean views with balcony', '["Free WiFi", "Smart TV", "Balcony", "Ocean View"]', 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'),
   ('501', 'Penthouse Suite', 1299.00, 6, 'Ultimate luxury with panoramic city views', '["Free WiFi", "Smart TV", "Private Elevator", "Butler Service", "Private Terrace"]', 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'),
   ('103', 'Standard', 199.00, 2, 'Comfortable room with essential amenities', '["Free WiFi", "TV", "Coffee Maker"]', 'https://images.unsplash.com/photo-1590073242678-70ee3fc28e8e?ixlib=rb-4.0.3&auto=format&fit=crop&w=2125&q=80');

   -- Sample meals
   INSERT INTO meals (name, description, category, price, image_url) VALUES
   ('Grilled Salmon', 'Fresh Atlantic salmon with herbs and lemon', 'Main Course', 32.00, 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?ixlib=rb-4.0.3&auto=format&fit=crop&w=2074&q=80'),
   ('Ribeye Steak', 'Prime cut with roasted vegetables', 'Main Course', 45.00, 'https://images.unsplash.com/photo-1546837525-f40e97c0d0e3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'),
   ('Caesar Salad', 'Fresh romaine with parmesan and croutons', 'Salad', 14.00, 'https://images.unsplash.com/photo-1546793665-c74683f339c1?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80');

   -- Sample spa services
   INSERT INTO spa_services (name, description, category, price, duration_minutes, image_url) VALUES
   ('Signature Massage', 'Swedish and deep tissue techniques', 'Massage', 120.00, 60, 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'),
   ('Detoxifying Body Wrap', 'Mineral-rich seaweed treatment', 'Body Treatment', 150.00, 90, 'https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'),
   ('Luxury Facial', 'Customized facial with premium products', 'Facial', 110.00, 75, 'https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80');
   ```

### Step 3: Configure Backend Environment

1. Navigate to the Backend directory:
   ```bash
   cd Backend
   ```

2. Update the `hotel.env` file with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=luxury_hotel
   JWT_SECRET=your_secret_key_here
   PORT=3000
   NODE_ENV=development
   ```

   **Note**: Replace `your_mysql_password` with your actual MySQL root password.

3. Install backend dependencies:
   ```bash
   npm install
   ```

   This will install all required packages:
   - express
   - mysql2
   - cors
   - bcryptjs
   - jsonwebtoken
   - dotenv

## 🏃 Running the Application

### Step 1: Start the Backend Server

1. Make sure you're in the `Backend` directory:
   ```bash
   cd Backend
   ```

2. Start the server:
   ```bash
   npm start
   ```
   
   Or for development with auto-reload (if nodemon is installed):
   ```bash
   npm run dev
   ```

3. You should see:
   ```
   Connected to MySQL database as id X
   Luxury Hotel Server running on port 3000
   Visit: http://localhost:3000
   ```

   The backend API is now running on `http://localhost:3000`

### Step 2: Open the Frontend

You have two options:

#### Option A: Open Directly in Browser (Recommended for Development)

1. Navigate to the `Frontend` folder
2. Open `Index.html` in your web browser
   - You can double-click the file, or
   - Right-click → Open with → Your preferred browser

3. The application should load and connect to the backend API

#### Option B: Serve via HTTP Server (Recommended for Production)

For better security and to avoid CORS issues, serve the frontend through a local server:

**Using Python (if installed):**
```bash
# Navigate to Frontend directory
cd Frontend

# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

**Using Node.js http-server:**
```bash
# Install http-server globally (one time)
npm install -g http-server

# Navigate to Frontend directory
cd Frontend

# Start server
http-server -p 8080
```

Then open `http://localhost:8080` in your browser.

**Using VS Code Live Server:**
- Install the "Live Server" extension in VS Code
- Right-click on `Index.html` → "Open with Live Server"

### Step 3: Verify Everything Works

1. **Backend**: Check `http://localhost:3000/api/rooms` in your browser - you should see JSON data
2. **Frontend**: Open the frontend page and navigate through:
   - Home page
   - Rooms page (should show available rooms)
   - Dining page
   - Spa page
   - Booking page

## 🔌 API Endpoints

The backend provides the following API endpoints:

### Rooms
- `GET /api/rooms` - Get all rooms with availability status
- `GET /api/rooms/availability?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&room_type=TYPE` - Check room availability

### Bookings
- `POST /api/bookings` - Create a new booking
- `GET /api/bookings/:id` - Get booking details

### Meals
- `GET /api/meals` - Get all available meals
- `GET /api/meals/category/:category` - Get meals by category
- `POST /api/meal-orders` - Create a meal order

### Spa
- `GET /api/spa/services` - Get all spa services
- `GET /api/spa/hours` - Get spa operating hours
- `POST /api/spa-appointments` - Book a spa appointment

### Admin (Protected)
- `GET /api/admin/dashboard` - Get dashboard statistics (requires authentication)

## ⚙️ Configuration

### Backend Port
Default port is `3000`. Change it in `Backend/hotel.env`:
```env
PORT=3000
```

### Frontend API URL
The frontend connects to `http://localhost:3000/api` by default. If you change the backend port, update `Frontend/js/script.js`:
```javascript
const API_BASE = 'http://localhost:YOUR_PORT/api';
```

### Database Connection
Update database settings in `Backend/hotel.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=luxury_hotel
```

## 🐛 Troubleshooting

### Backend Issues

**Problem: Database connection failed**
- ✅ Check MySQL is running: `mysql -u root -p`
- ✅ Verify credentials in `hotel.env`
- ✅ Ensure database `luxury_hotel` exists
- ✅ Check MySQL port (default: 3306)

**Problem: Port 3000 already in use**
- ✅ Change PORT in `hotel.env` to another port (e.g., 3001)
- ✅ Or stop the process using port 3000

**Problem: Module not found errors**
- ✅ Run `npm install` in the Backend directory
- ✅ Check `package.json` for all dependencies

### Frontend Issues

**Problem: Cannot connect to API / CORS errors**
- ✅ Ensure backend is running on port 3000
- ✅ Check browser console for errors
- ✅ Verify API_BASE URL in `Frontend/js/script.js`
- ✅ Use a local HTTP server instead of opening file directly

**Problem: Pages not loading / 404 errors**
- ✅ Ensure all files are in correct directories:
  - `Frontend/Index.html`
  - `Frontend/css/style.css`
  - `Frontend/js/script.js`
- ✅ Check file paths in HTML (should be relative paths)

**Problem: No rooms showing**
- ✅ Check database has rooms inserted
- ✅ Verify backend API is accessible: `http://localhost:3000/api/rooms`
- ✅ Check browser console for JavaScript errors

### Database Issues

**Problem: Tables don't exist**
- ✅ Run all CREATE TABLE statements from Step 2
- ✅ Verify you're using the correct database: `USE luxury_hotel;`

**Problem: Foreign key constraint errors**
- ✅ Ensure tables are created in the correct order
- ✅ Check that referenced records exist before inserting

## 📝 Development Notes

- **Backend**: Uses Express.js with MySQL2 for database operations
- **Frontend**: Pure vanilla JavaScript (no frameworks) for easy customization
- **Styling**: Custom CSS with CSS variables for theming
- **Icons**: Font Awesome 6.0 (loaded via CDN)

## 🔒 Security Notes

- Change `JWT_SECRET` in production
- Use strong database passwords
- Implement rate limiting for production
- Add input validation and sanitization
- Use HTTPS in production
- Never commit `.env` files to version control

## 📞 Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Verify all prerequisites are installed
3. Check browser console and terminal for error messages
4. Ensure database is properly set up with sample data

## 🎉 You're All Set!

Your Luxury Hotel Booking System should now be running. Enjoy exploring the features!

---

**Happy Coding! 🚀**


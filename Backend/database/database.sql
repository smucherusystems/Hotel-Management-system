USE luxury_hotel;

-- ======================================================
-- ROOMS TABLE
-- ======================================================
CREATE TABLE IF NOT EXISTS rooms (
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

-- ======================================================
-- BOOKINGS TABLE
-- ======================================================
CREATE TABLE IF NOT EXISTS bookings (
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

-- ======================================================
-- MEALS TABLE
-- ======================================================
CREATE TABLE IF NOT EXISTS meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ======================================================
-- MEAL ORDERS TABLE
-- ======================================================
CREATE TABLE IF NOT EXISTS meal_orders (
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

-- ======================================================
-- ORDER ITEMS TABLE
-- ======================================================
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    meal_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES meal_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

-- ======================================================
-- SPA SERVICES TABLE
-- ======================================================
CREATE TABLE IF NOT EXISTS spa_services (
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

-- ======================================================
-- SPA APPOINTMENTS TABLE
-- ======================================================
CREATE TABLE IF NOT EXISTS spa_appointments (
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

-- ======================================================
-- SPA HOURS TABLE
-- ======================================================
CREATE TABLE IF NOT EXISTS spa_hours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_of_week VARCHAR(20) NOT NULL,
    is_open BOOLEAN DEFAULT TRUE,
    open_time TIME,
    close_time TIME,
    UNIQUE KEY unique_day (day_of_week)
);

-- ======================================================
-- INSERT SPA HOURS SAFELY
-- Prevent duplicates using INSERT IGNORE
-- ======================================================
INSERT IGNORE INTO spa_hours (day_of_week, is_open, open_time, close_time) VALUES
('Monday', TRUE, '09:00:00', '20:00:00'),
('Tuesday', TRUE, '09:00:00', '20:00:00'),
('Wednesday', TRUE, '09:00:00', '20:00:00'),
('Thursday', TRUE, '09:00:00', '20:00:00'),
('Friday', TRUE, '09:00:00', '21:00:00'),
('Saturday', TRUE, '10:00:00', '21:00:00'),
('Sunday', TRUE, '10:00:00', '18:00:00');


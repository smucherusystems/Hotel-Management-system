-- Database Migration Script
-- Run this script to update your database schema to match the new frontend requirements

USE luxury_hotel;

-- Add missing columns to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS id_number VARCHAR(50) NULL AFTER customer_phone,
ADD COLUMN IF NOT EXISTS payment_method ENUM('cash', 'card', 'mpesa') NULL AFTER total_amount,
ADD COLUMN IF NOT EXISTS booking_reference VARCHAR(20) UNIQUE NULL AFTER id,
ADD COLUMN IF NOT EXISTS discount_code VARCHAR(50) NULL AFTER payment_method;

-- Update order_items to allow NULL meal_id for bar/cafe items
ALTER TABLE order_items 
MODIFY COLUMN meal_id INT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_booking_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_booking_dates ON bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_booking_status ON bookings(status);

-- Create users table for authentication (if it doesn't exist)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role ENUM('guest', 'staff', 'admin') DEFAULT 'guest',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create discount_codes table (optional, for future use)
CREATE TABLE IF NOT EXISTS discount_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage DECIMAL(5,2) NOT NULL,
    max_uses INT DEFAULT NULL,
    current_uses INT DEFAULT 0,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints if they don't exist
-- Note: These may fail if constraints already exist, which is fine

-- Add user_id to bookings (optional, for linking bookings to user accounts)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS user_id INT NULL AFTER id,
ADD CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Update existing bookings to have booking references if they don't have them
UPDATE bookings 
SET booking_reference = CONCAT('BK', LPAD(id, 8, '0'), LPAD(FLOOR(RAND() * 1000), 3, '0'))
WHERE booking_reference IS NULL;

-- Add created_at and updated_at timestamps to meal_orders if they don't exist
ALTER TABLE meal_orders
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add created_at and updated_at timestamps to order_items if they don't exist
ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Ensure all tables have proper charset
ALTER TABLE bookings CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE rooms CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE meals CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE meal_orders CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE order_items CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Display success message
SELECT 'Database migration completed successfully!' as status;


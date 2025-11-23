const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './hotel.env' });

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'luxury_hotel_secret_key';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'luxury_hotel',
    charset: 'utf8mb4'
});

const connectToDatabase = () => {
    db.connect((err) => {
        if (err) {
            console.error('Database connection failed:', err.message);
            setTimeout(connectToDatabase, 5000);
            return;
        }
        console.log('Connected to MySQL database as id ' + db.threadId);
    });
};

connectToDatabase();

db.on('error', (err) => {
    console.error('MySQL error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.warn('MySQL connection lost. Attempting reconnection...');
        connectToDatabase();
    }
});

// Validation helper functions
const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePhone = (phone) => {
    return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

const validateDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
};

const checkDuplicateBooking = ({ customer_email, id_number, check_in, check_out }) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id FROM bookings
            WHERE status IN ('confirmed', 'checked_in')
              AND (
                    (customer_email = ? AND check_in = ? AND check_out = ?)
                 OR (id_number = ? AND check_in = ? AND check_out = ?)
              )
            LIMIT 1
        `;

        db.query(query, [
            customer_email,
            check_in,
            check_out,
            id_number,
            check_in,
            check_out
        ], (err, results) => {
            if (err) {
                return reject(err);
            }
            resolve(results.length > 0);
        });
    });
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Error handling middleware
const handleError = (err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// API Routes

// Get all rooms with real-time availability
app.get('/api/rooms', (req, res) => {
    const query = `
        SELECT r.*, 
               COUNT(b.id) as active_bookings,
               CASE 
                   WHEN COUNT(b.id) > 0 THEN 'occupied' 
                   ELSE r.status 
               END as current_status
        FROM rooms r
        LEFT JOIN bookings b ON r.id = b.room_id 
            AND b.status IN ('confirmed', 'checked_in')
            AND CURDATE() BETWEEN b.check_in AND b.check_out
        GROUP BY r.id
        ORDER BY r.room_number
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        // Parse JSON features
        try {
            results = results.map(room => ({
                ...room,
                features: typeof room.features === 'string' ? JSON.parse(room.features || '[]') : (room.features || [])
            }));
        } catch (parseErr) {
            console.error('Error parsing features:', parseErr);
            results = results.map(room => ({
                ...room,
                features: []
            }));
        }
        
        res.json(results);
    });
});

// Get room availability for specific dates
app.get('/api/rooms/availability', (req, res) => {
    const { check_in, check_out, room_type } = req.query;
    
    if (!check_in || !check_out) {
        return res.status(400).json({ success: false, error: 'Check-in and check-out dates are required' });
    }

    let query = `
        SELECT r.* 
        FROM rooms r
        WHERE r.id NOT IN (
            SELECT DISTINCT room_id 
            FROM bookings 
            WHERE status IN ('confirmed', 'checked_in')
            AND (check_in <= ? AND check_out >= ?)
        )
        AND r.status = 'available'
    `;
    
    const params = [check_out, check_in];
    
    if (room_type && room_type !== 'all') {
        query += ' AND r.room_type = ?';
        params.push(room_type);
    }
    
    query += ' ORDER BY r.price';
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        // Parse JSON features
        results = results.map(room => ({
            ...room,
            features: JSON.parse(room.features || '[]')
        }));
        
        res.json(results);
    });
});

// Create a new booking (enhanced endpoint with full validation)
app.post('/api/book-room', async (req, res) => {
    const { 
        room_id, 
        customer_name, 
        customer_email, 
        customer_phone, 
        id_number, 
        check_in, 
        check_out, 
        guests, 
        room_type, 
        payment_method, 
        discount_code, 
        total_amount 
    } = req.body;
    
    const normalizedCustomerName = (customer_name || '').trim();
    const normalizedCustomerEmail = (customer_email || '').trim().toLowerCase();
    const normalizedCustomerPhone = (customer_phone || '').trim();
    const normalizedIdNumber = (id_number || '').trim();
    const normalizedPaymentMethod = (payment_method || '').trim().toLowerCase();
    const normalizedDiscountCode = discount_code ? discount_code.trim() : null;
    
    // Comprehensive validation
    const errors = [];
    
    if (!room_id) errors.push('Room ID is required');
    if (!normalizedCustomerName || normalizedCustomerName.length < 2) errors.push('Valid customer name is required (minimum 2 characters)');
    if (!normalizedCustomerEmail || !validateEmail(normalizedCustomerEmail)) errors.push('Valid email address is required');
    if (!normalizedCustomerPhone || !validatePhone(normalizedCustomerPhone)) errors.push('Valid phone number is required');
    if (!normalizedIdNumber || normalizedIdNumber.length < 3) errors.push('Valid ID/Passport number is required');

    if (!check_in || !validateDate(check_in)) errors.push('Valid check-in date is required');
    if (!check_out || !validateDate(check_out)) errors.push('Valid check-out date is required');
    if (!guests || guests < 1 || guests > 8) errors.push('Number of guests must be between 1 and 8');
    if (!normalizedPaymentMethod || !['cash', 'card', 'mpesa'].includes(normalizedPaymentMethod)) {
        errors.push('Valid payment method is required (cash, card, or mpesa)');
    }
    
    // Date validation
    if (check_in && check_out) {
        const checkInDate = new Date(check_in);
        const checkOutDate = new Date(check_out);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (checkInDate < today) {
            errors.push('Check-in date cannot be in the past');
        }
        if (checkOutDate <= checkInDate) {
            errors.push('Check-out date must be after check-in date');
        }
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false,
            error: 'Validation failed',
            errors: errors 
        });
    }

    try {
        const isDuplicate = await checkDuplicateBooking({
            customer_email: normalizedCustomerEmail,
            id_number: normalizedIdNumber,
            check_in,
            check_out
        });

        if (isDuplicate) {
            return res.status(409).json({
                success: false,
                error: 'Duplicate booking detected for this guest and stay dates. Please review existing reservations.'
            });
        }
    } catch (dupErr) {
        console.error('Duplicate check error:', dupErr);
        return res.status(500).json({ success: false, error: 'Failed to verify existing bookings. Please try again.' });
    }
    
    // Generate unique booking reference
    const bookingReference = 'BK' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    // Start transaction for data consistency
    db.beginTransaction((err) => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({ success: false, error: 'Transaction initialization failed' });
        }
        
        // First, verify room exists and get its details
        db.query('SELECT * FROM rooms WHERE id = ? AND status != "maintenance"', [room_id], (err, roomResults) => {
            if (err) {
                return db.rollback(() => {
                    console.error('Database error:', err);
                    res.status(500).json({ success: false, error: 'Database error' });
                });
            }
            
            if (roomResults.length === 0) {
                return db.rollback(() => {
                    res.status(404).json({ success: false, error: 'Room not found or unavailable' });
                });
            }
            
            const room = roomResults[0];
            
            // Check if room is available for the dates
            const availabilityQuery = `
                SELECT COUNT(*) as count 
                FROM bookings 
                WHERE room_id = ? 
                AND status IN ('confirmed', 'checked_in')
                AND (
                    (check_in <= ? AND check_out >= ?) OR
                    (check_in <= ? AND check_out >= ?) OR
                    (check_in >= ? AND check_out <= ?)
                )
            `;
            
            db.query(availabilityQuery, [room_id, check_out, check_in, check_in, check_out, check_in, check_out], (err, results) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Database error:', err);
                        res.status(500).json({ success: false, error: 'Database error' });
                    });
                }
                
                if (results[0].count > 0) {
                    return db.rollback(() => {
                        res.status(400).json({ 
                            success: false,
                            error: 'Room is not available for the selected dates' 
                        });
                    });
                }
                
                // Calculate total amount
                const checkInDate = new Date(check_in);
                const checkOutDate = new Date(check_out);
                const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
                let finalAmount = total_amount || (parseFloat(room.price) * nights);
                
                // Apply discount if provided
                if (normalizedDiscountCode) {
                    // In production, validate discount code from database
                    // For now, apply 10% discount for any code
                    finalAmount = finalAmount * 0.9;
                }
                
                // Create booking with all fields
                const insertQuery = `
                    INSERT INTO bookings (
                        room_id, customer_name, customer_email, customer_phone, 
                        id_number, check_in, check_out, guests, total_amount, 
                        payment_method, discount_code, booking_reference, 
                        special_requests, status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
                `;
                
                const specialRequests = `Payment: ${normalizedPaymentMethod}${normalizedDiscountCode ? ` | Discount: ${normalizedDiscountCode}` : ''}`;
                
                db.query(insertQuery, [
                    room_id, 
                    normalizedCustomerName, 
                    normalizedCustomerEmail, 
                    normalizedCustomerPhone,
                    normalizedIdNumber,
                    check_in, 
                    check_out, 
                    parseInt(guests), 
                    parseFloat(finalAmount.toFixed(2)),
                    normalizedPaymentMethod,
                    normalizedDiscountCode || null,
                    bookingReference,
                    specialRequests
                ], (err, result) => {
                    if (err) {
                        return db.rollback(() => {
                            console.error('Database error:', err);
                            res.status(500).json({ 
                                success: false,
                                error: 'Failed to create booking',
                                details: err.message 
                            });
                        });
                    }
                    
                    // Update room status if check-in is today
                    const today = new Date().toISOString().split('T')[0];
                    if (check_in === today) {
                        db.query('UPDATE rooms SET status = "occupied" WHERE id = ?', [room_id], (updateErr) => {
                            if (updateErr) {
                                console.error('Error updating room status:', updateErr);
                            }
                        });
                    }
                    
                    // Commit transaction
                    db.commit((err) => {
                        if (err) {
                            return db.rollback(() => {
                                console.error('Commit error:', err);
                                res.status(500).json({ success: false, error: 'Failed to complete booking' });
                            });
                        }
                        
                        res.json({ 
                            success: true,
                            message: 'Booking created successfully', 
                            booking_id: result.insertId,
                            booking_reference: bookingReference,
                            total_amount: parseFloat(finalAmount.toFixed(2)),
                            nights: nights,
                            check_in: check_in,
                            check_out: check_out
                        });
                    });
                });
            });
        });
    });
});

// Create a new booking (legacy endpoint)
app.post('/api/bookings', (req, res) => {
    const { room_id, customer_name, customer_email, customer_phone, check_in, check_out, guests, total_amount, special_requests } = req.body;
    
    // Validate required fields
    if (!room_id || !customer_name || !customer_email || !check_in || !check_out) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // First check if room is available for the dates
    const availabilityQuery = `
        SELECT COUNT(*) as count 
        FROM bookings 
        WHERE room_id = ? 
        AND status IN ('confirmed', 'checked_in')
        AND (check_in <= ? AND check_out >= ?)
    `;
    
    db.query(availabilityQuery, [room_id, check_out, check_in], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        if (results[0].count > 0) {
            return res.status(400).json({ success: false, error: 'Room is not available for the selected dates' });
        }
        
        // Generate booking reference
        const bookingReference = 'BK' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        // Create booking
        const insertQuery = `
            INSERT INTO bookings (room_id, customer_name, customer_email, customer_phone, check_in, check_out, guests, total_amount, special_requests, booking_reference, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
        `;
        
        db.query(insertQuery, [
            room_id, customer_name, customer_email, customer_phone, 
            check_in, check_out, guests || 1, total_amount, special_requests, bookingReference
        ], (err, result) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            // Update room status if check-in is today
            if (check_in === new Date().toISOString().split('T')[0]) {
                db.query('UPDATE rooms SET status = "occupied" WHERE id = ?', [room_id]);
            }
            
            res.json({ 
                success: true,
                message: 'Booking created successfully', 
                booking_id: result.insertId,
                booking_reference: bookingReference
            });
        });
    });
});

// Get all meals
app.get('/api/meals', (req, res) => {
    const { category } = req.query;
    
    let query = 'SELECT * FROM meals WHERE is_available = TRUE';
    const params = [];
    
    if (category && category !== 'all') {
        query += ' AND category = ?';
        params.push(category);
    }
    
    query += ' ORDER BY category, price';
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json(results);
    });
});

// Get meals by category
app.get('/api/meals/category/:category', (req, res) => {
    const { category } = req.params;
    const query = 'SELECT * FROM meals WHERE category = ? AND is_available = TRUE ORDER BY price';
    
    db.query(query, [category], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json(results);
    });
});

// Create meal order (enhanced with validation)
app.post('/api/meal-orders', (req, res) => {
    const { booking_id, customer_name, room_number, order_type, items, special_instructions } = req.body;
    
    // Comprehensive validation
    const errors = [];
    
    if (!customer_name || customer_name.trim().length < 2) {
        errors.push('Valid customer name is required');
    }
    
    if (!room_number || room_number.trim().length === 0) {
        errors.push('Room number is required');
    }
    
    if (!order_type || !['restaurant', 'room_service'].includes(order_type)) {
        errors.push('Valid order type is required (restaurant or room_service)');
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        errors.push('At least one item is required');
    }
    
    // Validate items
    if (items && Array.isArray(items)) {
        items.forEach((item, index) => {
            if (!item.quantity || item.quantity < 1) {
                errors.push(`Item ${index + 1}: Invalid quantity`);
            }
            if (!item.price || item.price <= 0) {
                errors.push(`Item ${index + 1}: Invalid price`);
            }
        });
    }
    
    if (errors.length > 0) {
        return res.status(400).json({ 
            success: false,
            error: 'Validation failed',
            errors 
        });
    }
    
    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];
    
    // Start transaction
    db.beginTransaction((err) => {
        if (err) {
            console.error('Transaction error:', err);
            return res.status(500).json({ error: 'Transaction error' });
        }
        
        // First, create the order
        const orderQuery = `
            INSERT INTO meal_orders (booking_id, customer_name, room_number, order_type, total_amount, special_instructions)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        // Calculate total and prepare items
        Promise.all(items.map(async (item) => {
            let mealId = item.meal_id;
            let mealPrice;
            
            // Check if meal_id is numeric (exists in meals table)
            if (!isNaN(mealId) && mealId !== null) {
                const [mealRows] = await db.promise().query('SELECT price FROM meals WHERE id = ? AND is_available = TRUE', [mealId]);
                if (mealRows.length > 0) {
                    mealPrice = mealRows[0].price;
                } else {
                    // Meal not found, use price from request
                    mealPrice = item.price || 0;
                    mealId = null; // Set to null for items not in meals table
                }
            } else {
                // Bar/cafe item not in meals table, use price from request
                mealPrice = item.price || 0;
                mealId = null;
            }
            
            if (!mealPrice || mealPrice <= 0) {
                throw new Error(`Invalid price for item ${item.meal_id || item.name || 'unknown'}`);
            }
            
            totalAmount += mealPrice * item.quantity;
            
            orderItems.push({
                meal_id: mealId,
                quantity: item.quantity,
                price: mealPrice,
                name: item.name || 'Custom Item'
            });
        })).then(() => {
            // Insert order
            db.query(orderQuery, [booking_id, customer_name, room_number, order_type, totalAmount, special_instructions], (err, result) => {
                if (err) {
                    return db.rollback(() => {
                        console.error('Database error:', err);
                        res.status(500).json({ error: 'Database error' });
                    });
                }
                
                const orderId = result.insertId;
                
                // Insert order items
                // Handle items that may not exist in meals table (bar/cafe items)
                const itemQueries = orderItems.map(item => {
                    return new Promise((resolve, reject) => {
                        // Use NULL for meal_id if item doesn't exist in meals table
                        const mealId = (item.meal_id && !isNaN(item.meal_id)) ? item.meal_id : null;
                        
                        db.query(
                            'INSERT INTO order_items (order_id, meal_id, quantity, price) VALUES (?, ?, ?, ?)',
                            [orderId, mealId, item.quantity, item.price],
                            (err) => {
                                if (err) {
                                    console.error('Error inserting order item:', err);
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            }
                        );
                    });
                });
                
                Promise.all(itemQueries)
                    .then(() => {
                        db.commit((err) => {
                            if (err) {
                                return db.rollback(() => {
                                    console.error('Commit error:', err);
                                    res.status(500).json({ error: 'Commit error' });
                                });
                            }
                            
                            res.json({
                                success: true,
                                message: 'Meal order created successfully',
                                order_id: orderId,
                                total_amount: parseFloat(totalAmount.toFixed(2)),
                                items_count: orderItems.length,
                                order_type: order_type,
                                status: 'pending'
                            });
                        });
                    })
                    .catch(err => {
                        db.rollback(() => {
                            console.error('Item insertion error:', err);
                            res.status(500).json({ success: false, error: 'Item insertion error' });
                        });
                    });
            });
        }).catch(err => {
            db.rollback(() => {
                console.error('Price calculation error:', err);
                res.status(400).json({ success: false, error: err.message });
            });
        });
    });
});

// Get all spa services
app.get('/api/spa/services', (req, res) => {
    const query = 'SELECT * FROM spa_services WHERE is_available = TRUE ORDER BY category, price';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json(results);
    });
});

// Get spa hours
app.get('/api/spa/hours', (req, res) => {
    const query = 'SELECT * FROM spa_hours ORDER BY FIELD(day_of_week, "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json(results);
    });
});

// Create spa appointment
app.post('/api/spa-appointments', (req, res) => {
    const { booking_id, customer_name, service_id, appointment_date, appointment_time, notes } = req.body;
    
    if (!customer_name || !service_id || !appointment_date || !appointment_time) {
        return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Check if service exists and is available
    const serviceQuery = 'SELECT * FROM spa_services WHERE id = ? AND is_available = TRUE';
    
    db.query(serviceQuery, [service_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(400).json({ success: false, error: 'Spa service not available' });
        }
        
        // Check for conflicting appointments
        const conflictQuery = `
            SELECT COUNT(*) as count 
            FROM spa_appointments 
            WHERE service_id = ? 
            AND appointment_date = ? 
            AND appointment_time = ? 
            AND status = 'scheduled'
        `;
        
        db.query(conflictQuery, [service_id, appointment_date, appointment_time], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, error: 'Database error' });
            }
            
            if (results[0].count > 0) {
                return res.status(400).json({ success: false, error: 'Time slot not available' });
            }
            
            // Create appointment
            const insertQuery = `
                INSERT INTO spa_appointments (booking_id, customer_name, service_id, appointment_date, appointment_time, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, 'scheduled')
            `;
            
            db.query(insertQuery, [booking_id, customer_name, service_id, appointment_date, appointment_time, notes], (err, result) => {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({ success: false, error: 'Database error' });
                }
                
                res.json({
                    success: true,
                    message: 'Spa appointment created successfully',
                    appointment_id: result.insertId
                });
            });
        });
    });
});

// Get booking details by ID
app.get('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT b.*, r.room_number, r.room_type, r.price as room_price
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.id = ?
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }
        
        res.json({ success: true, booking: results[0] });
    });
});

// Get active bookings (for room service)
app.get('/api/bookings/active', (req, res) => {
    const query = `
        SELECT b.id, b.customer_name, b.customer_email, b.check_in, b.check_out,
               b.booking_reference, r.room_number, r.room_type
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE b.status IN ('confirmed', 'checked_in')
        AND CURDATE() BETWEEN b.check_in AND b.check_out
        ORDER BY b.check_in DESC
    `;
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json(results);
    });
});

// Get all bookings (with optional filters)
app.get('/api/bookings', (req, res) => {
    const { status, customer_email, booking_reference } = req.query;
    
    let query = `
        SELECT b.*, r.room_number, r.room_type, r.price as room_price
        FROM bookings b
        JOIN rooms r ON b.room_id = r.id
        WHERE 1=1
    `;
    const params = [];
    
    if (status) {
        query += ' AND b.status = ?';
        params.push(status);
    }
    
    if (customer_email) {
        query += ' AND b.customer_email = ?';
        params.push(customer_email);
    }
    
    if (booking_reference) {
        query += ' AND b.booking_reference = ?';
        params.push(booking_reference);
    }
    
    query += ' ORDER BY b.created_at DESC LIMIT 100';
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json(results);
    });
});

// Get all meal orders
app.get('/api/orders', (req, res) => {
    const { status, customer_name, order_type } = req.query;
    
    let query = `
        SELECT mo.*, 
               GROUP_CONCAT(
                   CONCAT(oi.quantity, 'x ', 
                   COALESCE(m.name, 'Custom Item'), 
                   ' ($', oi.price, ')')
                   SEPARATOR ', '
               ) as items_summary
        FROM meal_orders mo
        LEFT JOIN order_items oi ON mo.id = oi.order_id
        LEFT JOIN meals m ON oi.meal_id = m.id
        WHERE 1=1
    `;
    const params = [];
    
    if (status) {
        query += ' AND mo.status = ?';
        params.push(status);
    }
    
    if (customer_name) {
        query += ' AND mo.customer_name LIKE ?';
        params.push(`%${customer_name}%`);
    }
    
    if (order_type) {
        query += ' AND mo.order_type = ?';
        params.push(order_type);
    }
    
    query += ' GROUP BY mo.id ORDER BY mo.created_at DESC LIMIT 100';
    
    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        res.json(results);
    });
});

// Get order details by ID
app.get('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    
    const query = `
        SELECT mo.*, 
               JSON_ARRAYAGG(
                   JSON_OBJECT(
                       'id', oi.id,
                       'meal_id', oi.meal_id,
                       'quantity', oi.quantity,
                       'price', oi.price,
                       'meal_name', COALESCE(m.name, 'Custom Item')
                   )
               ) as items
        FROM meal_orders mo
        LEFT JOIN order_items oi ON mo.id = oi.order_id
        LEFT JOIN meals m ON oi.meal_id = m.id
        WHERE mo.id = ?
        GROUP BY mo.id
    `;
    
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        const order = results[0];
        if (order.items) {
            order.items = JSON.parse(order.items);
        }
        
        res.json(order);
    });
});

// Admin endpoints (protected)
app.get('/api/admin/dashboard', authenticateToken, (req, res) => {
    const dashboardQuery = `
        SELECT 
            (SELECT COUNT(*) FROM rooms WHERE status = 'available') as available_rooms,
            (SELECT COUNT(*) FROM rooms WHERE status = 'occupied') as occupied_rooms,
            (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as confirmed_bookings,
            (SELECT COUNT(*) FROM bookings WHERE status = 'checked_in') as checked_in_guests,
            (SELECT COUNT(*) FROM meal_orders WHERE status = 'pending') as pending_orders,
            (SELECT COUNT(*) FROM spa_appointments WHERE status = 'scheduled') as spa_appointments
    `;
    
    db.query(dashboardQuery, (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, error: 'Database error' });
        }
        
        res.json({ success: true, data: results[0] });
    });
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler (must be last, before error handler)
app.use((req, res) => {
    res.status(404).json({ 
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
});

// Error handling middleware (must be absolutely last)
app.use(handleError);

// Start server
app.listen(PORT, () => {
    console.log(`Luxury Hotel Server running on port ${PORT}`);
    console.log(`Visit: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.end();
    process.exit(0);
});
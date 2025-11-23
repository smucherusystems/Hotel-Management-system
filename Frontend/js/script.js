/**
 * Hotel Booking System - Frontend JavaScript
 * Main application file handling all UI interactions and API calls
 */

const API_BASE = 'http://localhost:3000/api';
const DEFAULT_MEAL_IMAGE = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80';
const ORDER_CART_STORAGE_KEY = 'luxuryHotelOrderCart';
const ORDER_TAX_RATE = 0.1;

// Global state management
let currentBooking = null;
let availableRooms = [];
let availableMeals = [];
let spaServices = [];
let orderMenuItems = [];
let filteredOrderItems = [];
let orderCart = [];
let hotelBookings = [];
let orderSectionInitialized = false;
let pendingOrderDetails = null;
let activeOrderCategory = 'all';
let orderSearchTerm = '';
let bookingFormInitialized = false;

function loadCartFromStorage() {
    try {
        const stored = localStorage.getItem(ORDER_CART_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn('Unable to parse stored order cart', error);
        return [];
    }
}

function saveCartToStorage() {
    localStorage.setItem(ORDER_CART_STORAGE_KEY, JSON.stringify(orderCart));
}

function updateBookingSelectOptions() {
    const bookingSelect = document.getElementById('bookingSelect');
    if (!bookingSelect) return;

    let optionsHTML = '<option value="">Select Booking...</option>';
    if (currentBooking) {
        optionsHTML += `<option value="${currentBooking.id}" selected>Booking #${currentBooking.id}</option>`;
    }
    bookingSelect.innerHTML = optionsHTML;
}

function rebuildOrderMenuItems() {
    const items = [];

    if (Array.isArray(availableMeals)) {
        availableMeals.forEach(meal => {
            if (!meal) return;
            items.push({
                id: `meal-${meal.id}`,
                mealId: meal.id,
                name: meal.name,
                description: meal.description || '',
                price: parseFloat(meal.price) || 0,
                category: 'Restaurant',
                type: 'restaurant',
                image: meal.image_url || DEFAULT_MEAL_IMAGE
            });
        });
    }

    const addStaticItems = (collection, category, type) => {
        collection.forEach(item => {
            if (!item) return;
            items.push({
                id: `${type}-${item.name.toLowerCase().replace(/\s+/g, '-')}`,
                mealId: null,
                name: item.name,
                description: item.description || item.details || '',
                price: parseFloat(item.price) || 0,
                category,
                type,
                image: DEFAULT_MEAL_IMAGE
            });
        });
    };

    // Bar menu items
    Object.values(barMenu).forEach(section => {
        if (Array.isArray(section)) {
            addStaticItems(section, 'Bar', 'bar');
        } else if (section && typeof section === 'object') {
            Object.values(section).forEach(subSection => {
                if (Array.isArray(subSection)) {
                    addStaticItems(subSection, 'Bar', 'bar');
                }
            });
        }
    });

    // Café menu items (treat desserts separately)
    if (cafeMenu) {
        ['breakfast', 'sandwiches', 'salads'].forEach(key => {
            if (Array.isArray(cafeMenu[key])) {
                addStaticItems(cafeMenu[key], 'Cafe', 'cafe');
            }
        });

        if (cafeMenu.beverages) {
            Object.values(cafeMenu.beverages).forEach(list => {
                if (Array.isArray(list)) addStaticItems(list, 'Cafe', 'cafe');
            });
        }

        if (Array.isArray(cafeMenu.desserts)) {
            addStaticItems(cafeMenu.desserts, 'Dessert', 'cafe-dessert');
        }
    }

    orderMenuItems = items;
    if (orderSectionInitialized) {
        renderMenuItems();
    }
}

function getFilteredMenuItems() {
    const searchTerm = orderSearchTerm.toLowerCase();
    return orderMenuItems.filter(item => {
        const categoryMatch = activeOrderCategory === 'all' || item.category === activeOrderCategory;
        const searchMatch = !searchTerm || `${item.name} ${item.description}`.toLowerCase().includes(searchTerm);
        return categoryMatch && searchMatch;
    });
}

function renderMenuItems() {
    const container = document.getElementById('menuItemsContainer');
    const emptyState = document.getElementById('emptyState');

    if (!container) return;

    const filteredItems = getFilteredMenuItems();

    if (filteredItems.length === 0) {
        container.innerHTML = '<div class="loading" style="padding: 40px 0;">No menu items found.</div>';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    container.innerHTML = filteredItems.map(item => `
        <div class="menu-item-card">
            <div class="menu-item-image" style="background-image: url('${item.image}')"></div>
            <h4>${item.name}</h4>
            <div class="menu-item-meta">
                <span>${item.category}</span>
                <span>$${item.price.toFixed(2)}</span>
            </div>
            <p class="menu-item-description">${item.description || ''}</p>
            <button class="btn" onclick="addItemToOrder('${item.id}')">
                <i class="fas fa-plus"></i> Add to Order
            </button>
        </div>
    `).join('');
}

function initializeOrderSection() {
    if (orderSectionInitialized) {
        return;
    }

    orderCart = loadCartFromStorage();

    const searchInput = document.getElementById('menuSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            orderSearchTerm = event.target.value;
            renderMenuItems();
        });
    }

    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            event.currentTarget.classList.add('active');
            activeOrderCategory = event.currentTarget.dataset.category || 'all';
            renderMenuItems();
        });
    });

    const orderTypeSelect = document.getElementById('orderType');
    const bookingGroup = document.getElementById('bookingGroup');
    const roomNumberGroup = document.getElementById('roomNumberGroup');

    if (orderTypeSelect) {
        orderTypeSelect.addEventListener('change', () => {
            const isRoomService = orderTypeSelect.value === 'room_service';
            if (bookingGroup) bookingGroup.style.display = isRoomService && currentBooking ? 'block' : 'none';
            if (roomNumberGroup) roomNumberGroup.style.display = isRoomService ? 'block' : 'none';
        });
    }

    const customerNameInput = document.getElementById('customerName');
    if (customerNameInput) {
        customerNameInput.addEventListener('input', refreshSubmitOrderState);
    }

    updateBookingSelectOptions();
    rebuildOrderMenuItems();
    updateCartUI();
    refreshSubmitOrderState();

    orderSectionInitialized = true;
}

function addItemToOrder(menuId) {
    const menuItem = orderMenuItems.find(item => item.id === menuId);
    if (!menuItem) return;

    const existing = orderCart.find(item => item.menuId === menuId);
    if (existing) {
        existing.quantity += 1;
    } else {
        orderCart.push({
            menuId,
            mealId: menuItem.mealId,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1,
            category: menuItem.category
        });
    }

    saveCartToStorage();
    updateCartUI();
}

function updateCartUI() {
    const cartItemsEl = document.getElementById('cartItems');
    if (!cartItemsEl) return;

    if (orderCart.length === 0) {
        cartItemsEl.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-bag"></i>
                <p>Your cart is empty</p>
                <p class="cart-empty-hint">Add items from the menu to get started</p>
            </div>
        `;
    } else {
        cartItemsEl.innerHTML = orderCart.map(item => `
            <div class="cart-item">
                <div>
                    <h5>${item.name}</h5>
                    <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                </div>
                <div class="quantity-controls">
                    <button type="button" onclick="updateCartQuantity('${item.menuId}', -1)">-</button>
                    <span>${item.quantity}</span>
                    <button type="button" onclick="updateCartQuantity('${item.menuId}', 1)">+</button>
                    <button type="button" onclick="removeCartItem('${item.menuId}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateCartTotals();
    updateCartBadge();
    refreshSubmitOrderState();
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
        const totalItems = orderCart.reduce((sum, item) => sum + item.quantity, 0);
        badge.textContent = totalItems;
    }
}

function updateCartTotals() {
    const subtotalEl = document.getElementById('subtotal');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total');

    const subtotal = orderCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * ORDER_TAX_RATE;
    const total = subtotal + tax;

    if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    saveCartToStorage();

    return { subtotal, tax, total };
}

function updateCartQuantity(menuId, delta) {
    const cartItem = orderCart.find(item => item.menuId === menuId);
    if (!cartItem) return;

    cartItem.quantity += delta;
    if (cartItem.quantity <= 0) {
        orderCart = orderCart.filter(item => item.menuId !== menuId);
    }

    saveCartToStorage();
    updateCartUI();
}

function removeCartItem(menuId) {
    orderCart = orderCart.filter(item => item.menuId !== menuId);
    saveCartToStorage();
    updateCartUI();
}

function clearOrderCart() {
    orderCart = [];
    saveCartToStorage();
    updateCartUI();
}

function refreshSubmitOrderState() {
    const submitBtn = document.getElementById('submitOrderBtn');
    if (!submitBtn) return;
    const customerName = document.getElementById('customerName');
    submitBtn.disabled = !(orderCart.length > 0 && customerName && customerName.value.trim().length > 1);
}

function submitOrder() {
    if (!orderCart.length) {
        alert('Please add at least one item to your cart.');
        return;
    }

    const customerNameInput = document.getElementById('customerName');
    const orderTypeSelect = document.getElementById('orderType');
    const specialInstructions = document.getElementById('specialInstructions');
    const roomNumberInput = document.getElementById('roomNumber');
    const bookingSelect = document.getElementById('bookingSelect');

    const customerName = customerNameInput ? customerNameInput.value.trim() : '';
    if (!customerName) {
        alert('Please enter your name.');
        return;
    }

    const orderType = orderTypeSelect ? orderTypeSelect.value : 'restaurant';
    let roomNumberValue = roomNumberInput ? roomNumberInput.value.trim() : '';

    if (orderType === 'room_service' && !roomNumberValue) {
        alert('Please provide your room number for room service orders.');
        return;
    }

    if (orderType === 'restaurant' && !roomNumberValue) {
        roomNumberValue = 'Restaurant';
    }

    const totals = updateCartTotals();
    const itemsPayload = orderCart.map(item => ({
        meal_id: item.mealId,
        quantity: item.quantity,
        price: item.price,
        name: item.name
    }));

    pendingOrderDetails = {
        booking_id: (bookingSelect && bookingSelect.value) || (currentBooking ? currentBooking.id : null),
        customer_name: customerName,
        room_number: roomNumberValue,
        order_type: orderType,
        special_instructions: specialInstructions ? specialInstructions.value.trim() : '',
        items: itemsPayload,
        totals
    };

    const confirmBody = document.getElementById('confirmModalBody');
    if (confirmBody) {
        confirmBody.innerHTML = `
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Order Type:</strong> ${orderType === 'room_service' ? 'Room Service' : 'Restaurant'}</p>
            <p><strong>Room/Location:</strong> ${roomNumberValue}</p>
            <div style="margin: 15px 0;">
                ${orderCart.map(item => `
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span>${item.name} × ${item.quantity}</span>
                        <span>$${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                `).join('')}
            </div>
            <p><strong>Total:</strong> $${pendingOrderDetails.totals.total.toFixed(2)}</p>
        `;
    }

    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
        confirmModal.classList.add('active');
    }
}

async function confirmMealOrder() {
    if (!pendingOrderDetails) {
        return;
    }

    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
        confirmModal.classList.remove('active');
    }

    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        const response = await fetch(`${API_BASE}/meal-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingOrderDetails)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showOrderSuccess(result, pendingOrderDetails);
            clearOrderCart();
        } else {
            const errorMsg = Array.isArray(result.errors) ? result.errors.join(', ') : (result.error || 'Order failed');
            alert(`Order failed: ${errorMsg}`);
        }
    } catch (error) {
        console.error('Error submitting meal order:', error);
        alert('Error submitting order. Please try again.');
    } finally {
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        pendingOrderDetails = null;
    }
}

function showOrderSuccess(result, details) {
    const successModal = document.getElementById('successModal');
    const successBody = document.getElementById('successModalBody');

    if (successBody) {
        successBody.innerHTML = `
            <p><strong>Order ID:</strong> ${result.order_id}</p>
            <p><strong>Customer:</strong> ${details.customer_name}</p>
            <p><strong>Type:</strong> ${details.order_type === 'room_service' ? 'Room Service' : 'Restaurant'}</p>
            <p><strong>Total Paid:</strong> $${(result.total_amount || details.totals.total).toFixed(2)}</p>
            <div style="margin-top: 15px;">
                ${orderCart.length ? '' : ''}
            </div>
        `;
    }

    if (successModal) {
        successModal.classList.add('active');
    }
}

function closeOrderConfirmModal() {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) {
        confirmModal.classList.remove('active');
    }
    pendingOrderDetails = null;
}

function closeOrderSuccessModal() {
    const successModal = document.getElementById('successModal');
    if (successModal) {
        successModal.classList.remove('active');
    }
}

function openOrderSection() {
    initializeOrderSection();
    const wrapper = document.getElementById('dining-order');
    if (wrapper) {
        wrapper.classList.add('active');
        document.body.classList.add('modal-open');
    }
    renderMenuItems();
}

function closeOrderSection() {
    const wrapper = document.getElementById('dining-order');
    if (wrapper) {
        wrapper.classList.remove('active');
        document.body.classList.remove('modal-open');
    }
    closeOrderConfirmModal();
    closeOrderSuccessModal();
}

function toggleOrderCart() {
    const cartSidebar = document.getElementById('cartSidebar');
    if (!cartSidebar) return;
    cartSidebar.classList.toggle('visible');
}

// Menu data for Bar and Cafe (static data for development)
const barMenu = {
    cocktails: [
        { name: 'Classic Old Fashioned', description: 'Bourbon, sugar, bitters, orange peel', price: 18, details: 'Premium bourbon' },
        { name: 'Moscow Mule', description: 'Vodka, ginger beer, lime', price: 16, details: 'Served in copper mug' },
        { name: 'Negroni', description: 'Gin, Campari, sweet vermouth', price: 17, details: 'Italian classic' },
        { name: 'Mojito', description: 'White rum, mint, lime, soda', price: 15, details: 'Fresh mint' },
        { name: 'Whiskey Sour', description: 'Bourbon, lemon, simple syrup', price: 16, details: 'Egg white option' },
        { name: 'Espresso Martini', description: 'Vodka, espresso, coffee liqueur', price: 18, details: 'Double shot' }
    ],
    wines: {
        red: [
            { name: 'Dom Pérignon', description: 'Champagne, France', price: 350, details: 'Vintage 2012' },
            { name: 'Château Margaux', description: 'Bordeaux, France', price: 450, details: '2015 Vintage' },
            { name: 'Opus One', description: 'Napa Valley, USA', price: 320, details: '2018 Vintage' },
            { name: 'Sassicaia', description: 'Tuscany, Italy', price: 280, details: '2017 Vintage' },
            { name: 'Penfolds Grange', description: 'South Australia', price: 380, details: '2016 Vintage' }
        ],
        white: [
            { name: 'Domaine Leflaive', description: 'Burgundy, France', price: 220, details: 'Chardonnay' },
            { name: 'Cloudy Bay', description: 'Marlborough, New Zealand', price: 65, details: 'Sauvignon Blanc' },
            { name: 'Cakebread', description: 'Napa Valley, USA', price: 85, details: 'Chardonnay' },
            { name: 'Veuve Clicquot', description: 'Champagne, France', price: 120, details: 'Yellow Label' }
        ],
        rose: [
            { name: 'Whispering Angel', description: 'Provence, France', price: 45, details: 'Côtes de Provence' },
            { name: 'Domaine Ott', description: 'Provence, France', price: 75, details: 'Rosé' }
        ]
    },
    beers: {
        craft: [
            { name: 'IPA Craft Beer', description: 'Local brewery, 6.5% ABV', price: 12, details: 'Hoppy, citrus notes' },
            { name: 'Stout Porter', description: 'Dark ale, 5.8% ABV', price: 11, details: 'Rich, chocolatey' },
            { name: 'Wheat Beer', description: 'Belgian style, 5.2% ABV', price: 10, details: 'Light, refreshing' }
        ],
        premium: [
            { name: 'Stella Artois', description: 'Belgium, 5% ABV', price: 9, details: 'Premium lager' },
            { name: 'Heineken', description: 'Netherlands, 5% ABV', price: 8, details: 'International' },
            { name: 'Corona Extra', description: 'Mexico, 4.5% ABV', price: 8, details: 'With lime' },
            { name: 'Guinness', description: 'Ireland, 4.2% ABV', price: 10, details: 'Draft stout' }
        ]
    },
    spirits: [
        { name: 'Macallan 18 Year', description: 'Single malt scotch', price: 85, details: 'Highland' },
        { name: 'Johnnie Walker Blue', description: 'Blended scotch', price: 65, details: 'Premium blend' },
        { name: 'Hennessy XO', description: 'Cognac, France', price: 75, details: 'Extra Old' },
        { name: 'Patrón Silver', description: 'Tequila, Mexico', price: 25, details: '100% agave' },
        { name: 'Grey Goose', description: 'Vodka, France', price: 18, details: 'Premium' }
    ],
    appetizers: [
        { name: 'Truffle Arancini', description: 'Risotto balls with truffle oil', price: 16, details: '4 pieces' },
        { name: 'Wagyu Sliders', description: 'Mini burgers with wagyu beef', price: 24, details: '3 sliders' },
        { name: 'Lobster Tacos', description: 'Fresh lobster in soft shells', price: 22, details: '2 tacos' },
        { name: 'Charcuterie Board', description: 'Selection of cured meats and cheeses', price: 28, details: 'For 2-3 people' }
    ]
};

const cafeMenu = {
    breakfast: [
        { name: 'Continental Breakfast', description: 'Pastries, fruits, yogurt, coffee', price: 18, details: 'All day' },
        { name: 'Eggs Benedict', description: 'Poached eggs, hollandaise, English muffin', price: 16, details: 'With ham or salmon' },
        { name: 'Avocado Toast', description: 'Sourdough, smashed avocado, poached egg', price: 14, details: 'Vegan option' },
        { name: 'French Toast', description: 'Brioche, maple syrup, berries', price: 15, details: 'With bacon' },
        { name: 'Pancake Stack', description: 'Buttermilk pancakes, syrup, butter', price: 13, details: '3 pancakes' }
    ],
    sandwiches: [
        { name: 'Club Sandwich', description: 'Turkey, bacon, lettuce, tomato', price: 16, details: 'Triple decker' },
        { name: 'Grilled Chicken', description: 'Marinated chicken, aioli, ciabatta', price: 15, details: 'With fries' },
        { name: 'Vegetarian Wrap', description: 'Hummus, vegetables, tahini', price: 13, details: 'Vegan' },
        { name: 'Reuben Sandwich', description: 'Corned beef, sauerkraut, Swiss cheese', price: 17, details: 'On rye' }
    ],
    salads: [
        { name: 'Caesar Salad', description: 'Romaine, parmesan, croutons, dressing', price: 14, details: 'With chicken +$5' },
        { name: 'Greek Salad', description: 'Feta, olives, tomatoes, cucumber', price: 13, details: 'Fresh vegetables' },
        { name: 'Quinoa Bowl', description: 'Quinoa, roasted vegetables, tahini', price: 15, details: 'Vegan' }
    ],
    beverages: {
        coffee: [
            { name: 'Espresso', description: 'Single shot', price: 4, details: 'Double +$2' },
            { name: 'Cappuccino', description: 'Espresso, steamed milk, foam', price: 5, details: 'Regular or large' },
            { name: 'Latte', description: 'Espresso, steamed milk', price: 5, details: 'Flavors available' },
            { name: 'Americano', description: 'Espresso, hot water', price: 4, details: 'Strong' },
            { name: 'Mocha', description: 'Espresso, chocolate, steamed milk', price: 6, details: 'Whipped cream' }
        ],
        tea: [
            { name: 'English Breakfast', description: 'Black tea blend', price: 5, details: 'Traditional' },
            { name: 'Green Tea', description: 'Jasmine or sencha', price: 5, details: 'Antioxidants' },
            { name: 'Herbal Tea', description: 'Chamomile, peppermint, or rooibos', price: 5, details: 'Caffeine-free' },
            { name: 'Earl Grey', description: 'Bergamot black tea', price: 5, details: 'Classic' }
        ],
        specialty: [
            { name: 'Fresh Orange Juice', description: 'Freshly squeezed', price: 6, details: 'Large glass' },
            { name: 'Smoothie Bowl', description: 'Acai, berries, granola', price: 12, details: 'Superfood' },
            { name: 'Iced Coffee', description: 'Cold brew, milk, ice', price: 6, details: 'Refreshing' }
        ]
    },
    desserts: [
        { name: 'Tiramisu', description: 'Classic Italian dessert', price: 10, details: 'Coffee-soaked' },
        { name: 'Chocolate Lava Cake', description: 'Warm chocolate cake, vanilla ice cream', price: 11, details: 'Molten center' },
        { name: 'Cheesecake', description: 'New York style, berry compote', price: 10, details: 'Creamy' },
        { name: 'Crème Brûlée', description: 'Vanilla custard, caramelized sugar', price: 9, details: 'French classic' }
    ]
};

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    const validPages = ['home', 'rooms', 'dining', 'spa', 'booking'];

    const handleInitialHash = () => {
        const hash = window.location.hash.replace('#', '');
        if (hash && validPages.includes(hash)) {
            showPage(hash);
        } else {
            showPage('home');
        }
    };

    window.addEventListener('popstate', function() {
        const hash = window.location.hash.replace('#', '');
        if (hash && validPages.includes(hash)) {
            showPage(hash);
        } else {
            showPage('home');
        }
    });

    handleInitialHash();
    loadInitialData();
    initializeAvailabilityDateInputs();
    initializePriceRangeSlider();
    initializeBookingForm();
});

function initializeAvailabilityDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    const checkIn = document.getElementById('checkIn');
    const checkOut = document.getElementById('checkOut');

    if (checkIn) {
        checkIn.min = today;
        checkIn.addEventListener('change', function() {
            const checkInDate = new Date(checkIn.value);
            checkInDate.setDate(checkInDate.getDate() + 1);
            if (checkOut) {
                checkOut.min = checkInDate.toISOString().split('T')[0];
            }
        });
    }

    if (checkOut) {
        checkOut.min = today;
    }
}

function initializePriceRangeSlider() {
    const priceRange = document.getElementById('priceRange');
    if (priceRange) {
        priceRange.addEventListener('input', function() {
            const maxPriceEl = document.getElementById('maxPrice');
            if (maxPriceEl) {
                maxPriceEl.textContent = '$' + this.value;
            }
        });
    }
}
        
        // Load initial data
        async function loadInitialData() {
            try {
                await loadRooms();
                await loadMeals();
                await loadSpaServices();
            } catch (error) {
                console.error('Error loading initial data:', error);
            }
        }
        
        // Page navigation function
        function showPage(pageId) {
            // Update URL hash without triggering hashchange event
            if (history.pushState) {
                const newUrl = window.location.pathname + '#' + pageId;
                window.history.pushState({ path: newUrl }, '', newUrl);
            } else {
                window.location.hash = pageId;
            }
            
            const pages = document.querySelectorAll('.page');
            pages.forEach(page => {
                page.classList.remove('active');
            });
            
            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                targetPage.classList.add('active');
                
                // Scroll to top of the page
                window.scrollTo(0, 0);
                
                const navLinks = document.querySelectorAll('nav a, .order-nav a');
                navLinks.forEach(link => {
                    link.classList.remove('active-nav');
                    const href = link.getAttribute('href');
                    if ((href && href.includes(pageId)) || 
                        (pageId === 'home' && (link.textContent.trim().toLowerCase() === 'home' || href === 'Index.html' || href === '/'))) {
                        link.classList.add('active-nav');
                    }
                });
                
                // Update background image based on page
                const backgrounds = document.querySelectorAll('.background-container');
                backgrounds.forEach(bg => bg.style.display = 'none');
                
                if (pageId === 'home') {
                    const homeBg = document.querySelector('.home-bg');
                    if (homeBg) homeBg.style.display = 'block';
                } else if (pageId === 'rooms') {
                    const roomsBg = document.querySelector('.rooms-bg');
                    if (roomsBg) roomsBg.style.display = 'block';
                    if (typeof loadRooms === 'function') loadRooms();
                } else if (pageId === 'dining') {
                    const diningBg = document.querySelector('.dining-bg');
                    if (diningBg) diningBg.style.display = 'block';
                    if (typeof loadMeals === 'function') loadMeals();
                } else if (pageId === 'spa') {
                    const spaBg = document.querySelector('.spa-bg');
                    if (spaBg) spaBg.style.display = 'block';
                    if (typeof loadSpaServices === 'function') loadSpaServices();
                } else if (pageId === 'booking') {
                    const roomsBg = document.querySelector('.rooms-bg');
                    if (roomsBg) roomsBg.style.display = 'block';
                    // Initialize booking form when page is shown
                    if (typeof initializeBookingForm === 'function') {
                        setTimeout(() => {
                            initializeBookingForm();
                        }, 100);
                    }
                }
            }
        }
        
        // Show loading state
        function showLoading(containerId) {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading...
                    </div>
                `;
            }
        }
        
        // Load rooms data
        async function loadRooms() {
            try {
                showLoading('roomsContainer');
                const response = await fetch(`${API_BASE}/rooms`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const rooms = await response.json();
                
                const container = document.getElementById('roomsContainer');
                if (!container) return;
                
                container.innerHTML = '';
                
                if (rooms.length === 0) {
                    container.innerHTML = '<p class="error-message">No rooms available at the moment.</p>';
                    return;
                }
                
                rooms.forEach(room => {
                    const statusClass = room.current_status === 'available' ? 'available' : 
                                      room.current_status === 'occupied' ? 'occupied' : 'maintenance';
                    const statusText = room.current_status === 'available' ? 'Available' : 
                                     room.current_status === 'occupied' ? 'Occupied' : 'Maintenance';
                    
                    const roomCard = `
                        <div class="room-card">
                            <div class="room-image" style="background-image: url('${room.image_url}')"></div>
                            <div class="room-details">
                                <h3 class="room-title">${room.room_type} Room 
                                    <span class="availability-status ${statusClass}">${statusText}</span>
                                </h3>
                                <p class="room-price">$${room.price}/night</p>
                                <p class="room-description">${room.description}</p>
                                <div class="room-features">
                                    ${room.features.map(feature => `
                                        <div class="room-feature"><i class="fas fa-check"></i> ${feature}</div>
                                    `).join('')}
                                </div>
                                <button class="btn" onclick="showPage('booking')" ${room.current_status !== 'available' ? 'disabled' : ''}>
                                    ${room.current_status === 'available' ? 'Book Now' : 'Not Available'}
                                </button>
                            </div>
                        </div>
                    `;
                    container.innerHTML += roomCard;
                });
            } catch (error) {
                console.error('Error loading rooms:', error);
                const container = document.getElementById('roomsContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i><br>
                            Error loading rooms. Please check if the server is running.<br>
                            <small>Make sure the backend server is running on port 3001</small>
                        </div>
                    `;
                }
            }
        }
        
        // Load meals data
        async function loadMeals() {
            try {
                showLoading('diningContainer');
                const response = await fetch(`${API_BASE}/meals`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const meals = await response.json();
                
                availableMeals = meals;
                const container = document.getElementById('diningContainer');
                if (!container) return;
                
                container.innerHTML = '';
                
                if (meals.length === 0) {
                    container.innerHTML = '<p class="error-message">No meals available at the moment.</p>';
                    return;
                }
                
                meals.forEach(meal => {
                    const mealCard = `
                        <div class="dining-card">
                            <div class="dining-image" style="background-image: url('${meal.image_url}')"></div>
                            <div class="dining-details">
                                <h3 class="dining-title">${meal.name}</h3>
                                <p class="dining-hours">${meal.category} • $${meal.price}</p>
                                <p class="dining-description">${meal.description}</p>
                                <button class="btn" onclick="orderMeal(${meal.id})">Order Now</button>
                            </div>
                        </div>
                    `;
                    container.innerHTML += mealCard;
                });
            } catch (error) {
                console.error('Error loading meals:', error);
                const container = document.getElementById('diningContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i><br>
                            Error loading menu. Please check if the server is running.<br>
                            <small>Make sure the backend server is running on port 3001</small>
                        </div>
                    `;
                }
            }
        }
        
        // Load spa services
        async function loadSpaServices() {
            try {
                showLoading('spaContainer');
                const response = await fetch(`${API_BASE}/spa/services`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const services = await response.json();
                
                spaServices = services;
                const container = document.getElementById('spaContainer');
                if (!container) return;
                
                container.innerHTML = '';
                
                if (services.length === 0) {
                    container.innerHTML = '<p class="error-message">No spa services available at the moment.</p>';
                    return;
                }
                
                services.forEach(service => {
                    const serviceCard = `
                        <div class="spa-card">
                            <div class="spa-image" style="background-image: url('${service.image_url}')"></div>
                            <div class="spa-details">
                                <h3 class="spa-title">${service.name}</h3>
                                <p class="spa-price">$${service.price}</p>
                                <div class="spa-duration"><i class="fas fa-clock"></i> ${service.duration_minutes} minutes</div>
                                <p class="spa-description">${service.description}</p>
                                <button class="btn" onclick="bookSpaService(${service.id})">Book Treatment</button>
                            </div>
                        </div>
                    `;
                    container.innerHTML += serviceCard;
                });
                
                // Load spa hours
                await loadSpaHours();
            } catch (error) {
                console.error('Error loading spa services:', error);
                const container = document.getElementById('spaContainer');
                if (container) {
                    container.innerHTML = `
                        <div class="error-message">
                            <i class="fas fa-exclamation-triangle"></i><br>
                            Error loading spa services. Please check if the server is running.<br>
                            <small>Make sure the backend server is running on port 3001</small>
                        </div>
                    `;
                }
            }
        }
        
        // Load spa hours
        async function loadSpaHours() {
            try {
                const response = await fetch(`${API_BASE}/spa/hours`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const hours = await response.json();
                
                const container = document.getElementById('spaHours');
                if (!container) return;
                
                container.innerHTML = '';
                
                const hoursList = hours.map(day => `
                    <div class="hour-item">
                        <div class="hour-day">${day.day_of_week}</div>
                        <div>${day.is_open ? `${day.open_time} - ${day.close_time}` : 'Closed'}</div>
                    </div>
                `).join('');
                
                container.innerHTML = hoursList;
            } catch (error) {
                console.error('Error loading spa hours:', error);
                const container = document.getElementById('spaHours');
                if (container) {
                    container.innerHTML = '<p class="error-message">Error loading spa hours.</p>';
                }
            }
        }
        
/**
 * Check room availability with improved filtering
 * Includes date validation, room type filtering, and price range filtering
 */
async function checkAvailability() {
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    const roomType = document.getElementById('roomType').value;
    const guests = parseInt(document.getElementById('guests').value) || 2;
    const maxPrice = parseInt(document.getElementById('priceRange').value) || 2000;
    
    // Validation
    if (!checkIn || !checkOut) {
        alert('Please select both check-in and check-out dates');
        return;
    }
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate >= checkOutDate) {
        alert('Check-out date must be after check-in date');
        return;
    }
    
    // Check if dates are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkInDate < today) {
        alert('Check-in date cannot be in the past');
        return;
    }
    
    try {
        showLoading('availableRooms');
        const response = await fetch(`${API_BASE}/rooms/availability?check_in=${checkIn}&check_out=${checkOut}&room_type=${roomType}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        let availableRooms = await response.json();
        
        // Filter by price range and guest capacity
        availableRooms = availableRooms.filter(room => {
            return room.price <= maxPrice && room.max_occupancy >= guests;
        });
        
        const container = document.getElementById('availableRooms');
        const days = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        
        if (availableRooms.length === 0) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-search"></i><br>
                    <h3>No rooms available</h3>
                    <p>No rooms match your criteria for the selected dates.</p>
                    <p style="font-size: 0.9rem; margin-top: 10px;">Try adjusting your dates, room type, or price range.</p>
                </div>
            `;
            return;
        }
        
        // Sort by price (lowest first)
        availableRooms.sort((a, b) => a.price - b.price);
        
        container.innerHTML = `
            <div style="text-align: center; margin-bottom: 30px;">
                <h3 style="color: var(--primary); margin-bottom: 10px;">
                    <i class="fas fa-check-circle"></i> ${availableRooms.length} Room${availableRooms.length > 1 ? 's' : ''} Available
                </h3>
                <p style="color: var(--gray);">
                    ${days} night${days > 1 ? 's' : ''} • ${guests} guest${guests > 1 ? 's' : ''}
                </p>
            </div>
        `;
        
        availableRooms.forEach(room => {
            const totalPrice = (room.price * days).toFixed(2);
            const pricePerNight = room.price.toFixed(2);
            
            const roomCard = `
                <div class="room-card room-card-enhanced" style="max-width: 900px; margin: 20px auto;">
                    <div style="display: flex; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 300px;">
                            <div class="room-image" style="height: 250px; background-image: url('${room.image_url || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'}')"></div>
                        </div>
                        <div style="flex: 2; min-width: 300px; padding: 25px;">
                            <h3 class="room-title">${room.room_type} Room</h3>
                            <p class="room-price">$${pricePerNight}/night</p>
                            <p class="room-description">
                                <i class="fas fa-door-open"></i> Room ${room.room_number || 'N/A'} • 
                                <i class="fas fa-users"></i> Max ${room.max_occupancy || 2} guests
                            </p>
                            ${room.description ? `<p class="room-description" style="margin-top: 10px;">${room.description}</p>` : ''}
                            <div class="room-features">
                                ${(room.features || []).map(feature => `
                                    <div class="room-feature"><i class="fas fa-check"></i> ${feature}</div>
                                `).join('')}
                            </div>
                            <div class="price-display">
                                <strong>Total for ${days} night${days > 1 ? 's' : ''}: $${totalPrice}</strong>
                            </div>
                            <button class="btn" onclick="openBookingModal(${room.id}, '${checkIn}', '${checkOut}', ${room.price}, ${days}, ${guests})" style="width: 100%; margin-top: 15px;">
                                <i class="fas fa-calendar-check"></i> Book Now
                            </button>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += roomCard;
        });
    } catch (error) {
        console.error('Error checking availability:', error);
        const container = document.getElementById('availableRooms');
        container.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i><br>
                <h3>Error checking availability</h3>
                <p>Please check if the server is running and try again.</p>
            </div>
        `;
    }
}
        
        // Initialize booking form when booking page is shown
        // This will be called when the booking page is displayed

        /**
         * Initialize booking form with event listeners
         */
        function initializeBookingForm() {
            if (bookingFormInitialized) {
                return;
            }

            const checkInDate = document.getElementById('checkInDate');
            const checkOutDate = document.getElementById('checkOutDate');
            const roomTypeSelect = document.getElementById('roomTypeSelect');
            const numGuests = document.getElementById('numGuests');

            // Set minimum dates
            const today = new Date().toISOString().split('T')[0];
            if (checkInDate) {
                checkInDate.min = today;
                checkInDate.addEventListener('change', function() {
                    const checkIn = new Date(this.value);
                    checkIn.setDate(checkIn.getDate() + 1);
                    if (checkOutDate) {
                        checkOutDate.min = checkIn.toISOString().split('T')[0];
                        if (checkOutDate.value && new Date(checkOutDate.value) <= new Date(this.value)) {
                            checkOutDate.value = '';
                        }
                    }
                    calculatePrice();
                });
            }

            if (checkOutDate) {
                checkOutDate.min = today;
                checkOutDate.addEventListener('change', calculatePrice);
            }

            if (roomTypeSelect) {
                roomTypeSelect.addEventListener('change', function() {
                    updateRoomPreview(this.value);
                    calculatePrice();
                });
            }

            if (numGuests) {
                numGuests.addEventListener('change', calculatePrice);
            }

            // Real-time validation
            const formInputs = document.querySelectorAll('#bookingForm input, #bookingForm select');
            formInputs.forEach(input => {
                input.addEventListener('blur', function() {
                    validateField(this);
                });
                input.addEventListener('input', function() {
                    if (this.id === 'discountCode') {
                        updatePriceSummary();
                    }
                });
            });

            bookingFormInitialized = true;
        }

        /**
         * Update room preview based on selected room type
         */
        async function updateRoomPreview(roomType) {
            const previewContent = document.getElementById('roomPreviewContent');
            if (!previewContent || !roomType) {
                previewContent.innerHTML = `
                    <div class="preview-placeholder">
                        <i class="fas fa-image"></i>
                        <p>Select a room type to see details</p>
                    </div>
                `;
                return;
            }

            try {
                // Load rooms to get details
                const response = await fetch(`${API_BASE}/rooms`);
                if (response.ok) {
                    const rooms = await response.json();
                    const room = rooms.find(r => r.room_type === roomType);
                    
                    if (room) {
                        previewContent.innerHTML = `
                            <div class="room-preview-image" style="background-image: url('${room.image_url || 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}')"></div>
                            <div class="room-preview-details">
                                <h4>${room.room_type} Room</h4>
                                <p class="room-preview-description">${room.description || 'Luxurious accommodation with premium amenities'}</p>
                                <div class="room-preview-amenities">
                                    ${(room.features || []).map(feature => `
                                        <span class="amenity-tag"><i class="fas fa-check"></i> ${feature}</span>
                                    `).join('')}
                                </div>
                                <div class="room-preview-price">
                                    <div class="price-label">Price per night</div>
                                    <div class="price-value">$${parseFloat(room.price).toFixed(2)}</div>
                                </div>
                            </div>
                        `;
                    } else {
                        showPreviewPlaceholder();
                    }
                } else {
                    showPreviewPlaceholder();
                }
            } catch (error) {
                console.error('Error loading room details:', error);
                showPreviewPlaceholder();
            }
        }

        function showPreviewPlaceholder() {
            const previewContent = document.getElementById('roomPreviewContent');
            if (previewContent) {
                previewContent.innerHTML = `
                    <div class="preview-placeholder">
                        <i class="fas fa-image"></i>
                        <p>Room details loading...</p>
                    </div>
                `;
            }
        }

        /**
         * Calculate booking price
         */
        function calculatePrice() {
            const checkIn = document.getElementById('checkInDate').value;
            const checkOut = document.getElementById('checkOutDate').value;
            const roomType = document.getElementById('roomTypeSelect').value;

            if (!checkIn || !checkOut || !roomType) {
                updatePriceDisplay(0, 0, 0);
                return;
            }

            const checkInDate = new Date(checkIn);
            const checkOutDate = new Date(checkOut);
            const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));

            if (nights <= 0) {
                updatePriceDisplay(0, 0, 0);
                return;
            }

            // Get room price
            fetch(`${API_BASE}/rooms`)
                .then(response => response.json())
                .then(rooms => {
                    const room = rooms.find(r => r.room_type === roomType);
                    if (room) {
                        const pricePerNight = parseFloat(room.price);
                        const subtotal = pricePerNight * nights;
                        updatePriceDisplay(pricePerNight, nights, subtotal);
                    }
                })
                .catch(error => {
                    console.error('Error calculating price:', error);
                });
        }

        /**
         * Update price display elements
         */
        function updatePriceDisplay(pricePerNight, nights, subtotal) {
            const pricePerNightEl = document.getElementById('pricePerNight');
            const numberOfNightsEl = document.getElementById('numberOfNights');
            const subtotalPriceEl = document.getElementById('subtotalPrice');
            const totalAmountEl = document.getElementById('totalAmount');

            if (pricePerNightEl) pricePerNightEl.textContent = `$${pricePerNight.toFixed(2)}`;
            if (numberOfNightsEl) numberOfNightsEl.textContent = nights;
            if (subtotalPriceEl) subtotalPriceEl.textContent = `$${subtotal.toFixed(2)}`;
            if (totalAmountEl) totalAmountEl.textContent = `$${subtotal.toFixed(2)}`;

            updatePriceSummary(subtotal);
        }

        function parseCurrency(value) {
            if (typeof value === 'number') {
                return value;
            }
            if (!value) {
                return 0;
            }
            return parseFloat(value.toString().replace(/[^0-9.]/g, '')) || 0;
        }

        function updatePriceSummary(baseSubtotal = null) {
            const subtotalEl = document.getElementById('subtotalPrice');
            const totalAmountEl = document.getElementById('totalAmount');
            const discountInput = document.getElementById('discountCode');

            let subtotal = baseSubtotal;
            if (subtotal === null || typeof subtotal === 'undefined') {
                subtotal = subtotalEl ? parseCurrency(subtotalEl.textContent) : 0;
            }

            let total = subtotal;
            const discountCode = discountInput ? discountInput.value.trim() : '';
            if (discountCode && subtotal > 0) {
                total = subtotal * 0.9;
            }

            if (totalAmountEl) {
                totalAmountEl.textContent = `$${total.toFixed(2)}`;
            }

            return total;
        }

        /**
         * Validate individual field
         */
        function validateField(field) {
            const errorEl = document.getElementById(field.id + 'Error');
            let isValid = true;
            let errorMessage = '';

            // Remove previous error styling
            field.classList.remove('error');

            // Validation rules
            if (field.hasAttribute('required') && !field.value.trim()) {
                isValid = false;
                errorMessage = 'This field is required';
            } else if (field.type === 'email' && field.value && !isValidEmail(field.value)) {
                isValid = false;
                errorMessage = 'Please enter a valid email address';
            } else if (field.type === 'tel' && field.value && !isValidPhone(field.value)) {
                isValid = false;
                errorMessage = 'Please enter a valid phone number';
            } else if (field.id === 'checkOutDate' && field.value) {
                const checkIn = document.getElementById('checkInDate').value;
                if (checkIn && new Date(field.value) <= new Date(checkIn)) {
                    isValid = false;
                    errorMessage = 'Check-out date must be after check-in date';
                }
            }

            if (!isValid) {
                field.classList.add('error');
                if (errorEl) errorEl.textContent = errorMessage;
            } else {
                if (errorEl) errorEl.textContent = '';
            }

            return isValid;
        }

        /**
         * Validate email format
         */
        function isValidEmail(email) {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        }

        /**
         * Validate phone format
         */
        function isValidPhone(phone) {
            return /^[\d\s\-\+\(\)]+$/.test(phone) && phone.replace(/\D/g, '').length >= 10;
        }

        function normalizeString(value = '') {
            return value ? value.toString().trim() : '';
        }

        function buildBookingPayload(formData) {
            const normalizedName = normalizeString(formData.get('fullName'));
            const normalizedEmail = normalizeString(formData.get('email')).toLowerCase();
            const normalizedPhone = normalizeString(formData.get('phone'));
            const normalizedId = normalizeString(formData.get('idNumber'));
            const normalizedDiscount = normalizeString(formData.get('discountCode')) || null;
            const normalizedPayment = normalizeString(formData.get('paymentMethod')).toLowerCase();

            return {
                customer_name: normalizedName,
                customer_email: normalizedEmail,
                customer_phone: normalizedPhone,
                id_number: normalizedId,
                check_in: formData.get('checkInDate'),
                check_out: formData.get('checkOutDate'),
                guests: parseInt(formData.get('numGuests')),
                room_type: normalizeString(formData.get('roomTypeSelect')),
                payment_method: normalizedPayment,
                discount_code: normalizedDiscount
            };
        }

        /**
         * Handle booking form submission
         */
        async function handleBookingSubmit(event) {
            event.preventDefault();

            // Validate all fields
            const form = event.target;
            const formData = new FormData(form);
            let isFormValid = true;

            // Validate each required field
            const requiredFields = ['fullName', 'email', 'phone', 'idNumber', 'checkInDate', 'checkOutDate', 'numGuests', 'roomTypeSelect', 'paymentMethod'];
            requiredFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field && !validateField(field)) {
                    isFormValid = false;
                }
            });

            if (!isFormValid) {
                alert('Please fill in all required fields correctly.');
                return;
            }

            // Get normalized form values
            const bookingData = buildBookingPayload(formData);

            const checkIn = new Date(bookingData.check_in);
            const checkOut = new Date(bookingData.check_out);
            const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

            const submitBtn = document.getElementById('confirmBookingBtn');
            const originalBtnContent = submitBtn ? submitBtn.innerHTML : '';

            try {
                const roomsResponse = await fetch(`${API_BASE}/rooms`);
                const rooms = await roomsResponse.json();
                const selectedRoom = rooms.find(r => r.room_type === bookingData.room_type);
                
                if (!selectedRoom) {
                    alert('Selected room type not found. Please try again.');
                    return;
                }

                bookingData.room_id = selectedRoom.id;
                const subtotal = parseFloat(selectedRoom.price) * nights;
                const totalWithDiscount = bookingData.discount_code ? subtotal * 0.9 : subtotal;
                bookingData.total_amount = parseFloat(totalWithDiscount.toFixed(2));

                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                }

                // Submit booking
                const response = await fetch(`${API_BASE}/book-room`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bookingData)
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    showBookingSuccess(result.booking_id, result.booking_reference, bookingData);
                    form.reset();
                    showPreviewPlaceholder();
                    updatePriceDisplay(0, 0, 0);
                    updatePriceSummary(0);
                } else {
                    const backendError = Array.isArray(result.errors) ? result.errors.join('\n') : (result.error || 'Unknown error');
                    alert(`Booking failed: ${backendError}`);
                }
            } catch (error) {
                console.error('Error submitting booking:', error);
                alert('Error making booking. Please try again.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnContent || '<i class="fas fa-check-circle"></i> Confirm Booking';
                }
            }
        }

        /**
         * Show booking success modal
         */
        function showBookingSuccess(bookingId, bookingReference, bookingData) {
            const modal = document.getElementById('bookingSuccessModal');
            const detailsEl = document.getElementById('successDetails');

            const checkIn = new Date(bookingData.check_in);
            const checkOut = new Date(bookingData.check_out);
            const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

            detailsEl.innerHTML = `
                <p><strong>Guest Name:</strong> ${bookingData.customer_name}</p>
                <p><strong>Email:</strong> ${bookingData.customer_email}</p>
                <p><strong>Room Type:</strong> ${bookingData.room_type}</p>
                <p><strong>Check-in:</strong> ${checkIn.toLocaleDateString()}</p>
                <p><strong>Check-out:</strong> ${checkOut.toLocaleDateString()}</p>
                <p><strong>Duration:</strong> ${nights} night${nights > 1 ? 's' : ''}</p>
                <p><strong>Guests:</strong> ${bookingData.guests}</p>
                <p><strong>Total Amount:</strong> $${bookingData.total_amount.toFixed(2)}</p>
                <div class="booking-ref">Booking Reference: ${bookingReference || 'BK' + bookingId}</div>
                <p style="margin-top: 20px; color: var(--gray); font-size: 0.9rem;">
                    A confirmation email has been sent to ${bookingData.customer_email}
                </p>
            `;

            modal.classList.add('active');
            currentBooking = {
                id: bookingId,
                customer_name: bookingData.customer_name,
                room_id: bookingData.room_id
            };
        }

        /**
         * Close success modal
         */
        function closeSuccessModal() {
            const modal = document.getElementById('bookingSuccessModal');
            if (modal) {
                modal.classList.remove('active');
            }
        }

        /**
         * Close booking modal (legacy function for old modal)
         */
        function closeBookingModal() {
            const modal = document.getElementById('bookingModal');
            if (modal) {
                modal.classList.remove('active');
            }
        }

        // Make functions globally available
        window.handleBookingSubmit = handleBookingSubmit;
        window.closeSuccessModal = closeSuccessModal;
        window.closeBookingModal = closeBookingModal;
        window.initializeBookingForm = initializeBookingForm;
        window.updateRoomPreview = updateRoomPreview;
        window.calculatePrice = calculatePrice;
        window.showPage = showPage;
        window.checkAvailability = checkAvailability;
        window.openBookingModal = openBookingModal;
        window.orderMeal = orderMeal;
        window.bookSpaService = bookSpaService;
        window.openMenuModal = openMenuModal;
        window.closeMenuModal = closeMenuModal;
        
        // Order a meal
        async function orderMeal(mealId) {
            if (!currentBooking) {
                const bookFirst = confirm('You need to have a booking to order meals. Would you like to book a room first?');
                if (bookFirst) {
                    showPage('booking');
                }
                return;
            }
            
            const meal = availableMeals.find(m => m.id === mealId);
            if (!meal) return;
            
            const quantity = prompt(`How many ${meal.name} would you like to order?`, '1');
            if (!quantity || isNaN(quantity) || parseInt(quantity) < 1) {
                alert('Please enter a valid quantity');
                return;
            }
            
            const orderType = confirm('Is this for room service? Click OK for room service, Cancel for restaurant dining.');
            const specialInstructions = prompt('Any special instructions for your order? (optional):', '');
            
            try {
                const response = await fetch(`${API_BASE}/meal-orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        customer_name: currentBooking.customer_name,
                        room_number: '101', // This would come from the actual booking
                        order_type: orderType ? 'room_service' : 'restaurant',
                        items: [{
                            meal_id: mealId,
                            quantity: parseInt(quantity)
                        }],
                        special_instructions: specialInstructions
                    })
                });
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    alert(`Meal order placed successfully! Order ID: ${result.order_id}\nTotal: $${result.total_amount}`);
                } else {
                    alert(`Order failed: ${result.error}`);
                }
            } catch (error) {
                console.error('Error ordering meal:', error);
                alert('Error placing order. Please try again.');
            }
        }
        
/**
 * Book spa service with improved user experience
 */
async function bookSpaService(serviceId) {
    if (!currentBooking) {
        const bookFirst = confirm('You need to have a booking to schedule spa services. Would you like to book a room first?');
        if (bookFirst) {
            showPage('booking');
        }
        return;
    }
    
    const service = spaServices.find(s => s.id === serviceId);
    if (!service) return;
    
    const appointmentDate = prompt('Enter appointment date (YYYY-MM-DD):');
    const appointmentTime = prompt('Enter appointment time (HH:MM):');
    const notes = prompt('Any special notes or preferences? (optional):', '');
    
    if (!appointmentDate || !appointmentTime) {
        alert('Date and time are required for spa appointments.');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/spa-appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customer_name: currentBooking.customer_name,
                service_id: serviceId,
                appointment_date: appointmentDate,
                appointment_time: appointmentTime,
                notes: notes
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            alert(`Spa appointment scheduled successfully! Appointment ID: ${result.appointment_id}`);
        } else {
            alert(`Appointment failed: ${result.error}`);
        }
    } catch (error) {
        console.error('Error booking spa service:', error);
        alert('Error scheduling appointment. Please try again.');
    }
}

/**
 * Open menu modal for Bar or Cafe
 * @param {string} type - 'bar' or 'cafe'
 */
function openMenuModal(type) {
    const modal = document.getElementById(`${type}MenuModal`);
    const content = document.getElementById(`${type}MenuContent`);
    
    if (!modal || !content) return;
    
    // Generate menu HTML based on type
    let menuHTML = '';
    
    if (type === 'bar') {
        menuHTML = generateBarMenuHTML();
    } else if (type === 'cafe') {
        menuHTML = generateCafeMenuHTML();
    }
    
    content.innerHTML = menuHTML;
    modal.classList.add('active');
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeMenuModal(type);
        }
    });
}

/**
 * Close menu modal
 * @param {string} type - 'bar' or 'cafe'
 */
function closeMenuModal(type) {
    const modal = document.getElementById(`${type}MenuModal`);
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Generate HTML for Bar menu
 */
function generateBarMenuHTML() {
    let html = '<div class="menu-section">';
    
    // Cocktails
    html += '<div class="menu-category"><h3 class="menu-category-title"><i class="fas fa-cocktail"></i> Signature Cocktails</h3>';
    barMenu.cocktails.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    html += '</div>';
    
    // Wines
    html += '<div class="menu-category"><h3 class="menu-category-title"><i class="fas fa-wine-glass"></i> Premium Wines</h3>';
    
    html += '<h4 style="color: var(--primary); margin: 15px 0 10px 0;">Red Wines</h4>';
    barMenu.wines.red.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    
    html += '<h4 style="color: var(--primary); margin: 15px 0 10px 0;">White Wines</h4>';
    barMenu.wines.white.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    
    html += '<h4 style="color: var(--primary); margin: 15px 0 10px 0;">Rosé Wines</h4>';
    barMenu.wines.rose.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    html += '</div>';
    
    // Beers
    html += '<div class="menu-category"><h3 class="menu-category-title"><i class="fas fa-beer"></i> Beers</h3>';
    
    html += '<h4 style="color: var(--primary); margin: 15px 0 10px 0;">Craft Beers</h4>';
    barMenu.beers.craft.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    
    html += '<h4 style="color: var(--primary); margin: 15px 0 10px 0;">Premium Beers</h4>';
    barMenu.beers.premium.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    html += '</div>';
    
    // Spirits
    html += '<div class="menu-category"><h3 class="menu-category-title"><i class="fas fa-wine-bottle"></i> Premium Spirits</h3>';
    barMenu.spirits.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    html += '</div>';
    
    // Appetizers
    html += '<div class="menu-category"><h3 class="menu-category-title"><i class="fas fa-utensils"></i> Bar Appetizers</h3>';
    barMenu.appetizers.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    html += '</div>';
    
    html += '</div>';
    return html;
}

/**
 * Generate HTML for Cafe menu
 */
function generateCafeMenuHTML() {
    let html = '<div class="menu-section">';
    
    // Breakfast
    html += '<div class="menu-category"><h3 class="menu-category-title"><i class="fas fa-sun"></i> Breakfast</h3>';
    cafeMenu.breakfast.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    html += '</div>';
    
    // Sandwiches
    html += '<div class="menu-category"><h3 class="menu-category-title"><i class="fas fa-bread-slice"></i> Sandwiches</h3>';
    cafeMenu.sandwiches.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    html += '</div>';
    
    // Salads
    html += '<div class="menu-category"><h3 class="menu-category-title"><i class="fas fa-leaf"></i> Salads</h3>';
    cafeMenu.salads.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    html += '</div>';
    
    // Beverages
    html += '<div class="menu-category"><h3 class="menu-category-title"><i class="fas fa-coffee"></i> Beverages</h3>';
    
    html += '<h4 style="color: var(--primary); margin: 15px 0 10px 0;">Coffee</h4>';
    cafeMenu.beverages.coffee.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    
    html += '<h4 style="color: var(--primary); margin: 15px 0 10px 0;">Tea</h4>';
    cafeMenu.beverages.tea.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    
    html += '<h4 style="color: var(--primary); margin: 15px 0 10px 0;">Specialty Drinks</h4>';
    cafeMenu.beverages.specialty.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    html += '</div>';
    
    // Desserts
    html += '<div class="menu-category"><h3 class="menu-category-title"><i class="fas fa-birthday-cake"></i> Desserts</h3>';
    cafeMenu.desserts.forEach(item => {
        html += `
            <div class="menu-item">
                <div class="menu-item-info">
                    <div class="menu-item-name">${item.name}</div>
                    <div class="menu-item-description">${item.description}</div>
                    <div class="menu-item-details">${item.details}</div>
                </div>
                <div class="menu-item-price">$${item.price}</div>
            </div>
        `;
    });
    html += '</div>';
    
    html += '</div>';
    return html;
}

/**
 * Open booking page with pre-filled data (when clicking Book Now from availability check)
 */
function openBookingModal(roomId, checkIn, checkOut, price, days, guests) {
    // Navigate to booking page and pre-fill data
    showPage('booking');
    
    // Pre-fill form fields if available
    setTimeout(() => {
        const checkInDate = document.getElementById('checkInDate');
        const checkOutDate = document.getElementById('checkOutDate');
        const numGuests = document.getElementById('numGuests');
        
        if (checkInDate) checkInDate.value = checkIn;
        if (checkOutDate) checkOutDate.value = checkOut;
        if (numGuests) numGuests.value = guests || 2;
        
        // Find and select room type
        fetch(`${API_BASE}/rooms`)
            .then(response => response.json())
            .then(rooms => {
                const room = rooms.find(r => r.id == roomId);
                if (room) {
                    const roomTypeSelect = document.getElementById('roomTypeSelect');
                    if (roomTypeSelect) {
                        roomTypeSelect.value = room.room_type;
                        updateRoomPreview(room.room_type);
                    }
                }
                calculatePrice();
            });
    }, 100);
}

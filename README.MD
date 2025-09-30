Canteen Ordering System
A full-stack web application for managing canteen orders with automatic order cancellation and stock management.
Features

Browse menu items with real-time stock updates
Add items to cart with stock validation
15-minute order timer with auto-cancellation
Automatic stock restoration on cancellation
Order history and reordering
Concurrent user support with transaction handling

Tech Stack
Backend:

Node.js & Express
MongoDB with Mongoose
Background jobs for auto-cancellation

Frontend:

React
Tailwind CSS
Lucide React icons

Prerequisites

Node.js 
MongoDB
npm or yarn

Installation
1. Clone the repository
bashgit clone https://github.com/Himanshityagii24/Locus-Project-.git

2. Backend Setup
bashcd backend
npm install

2. Frontend Setup
bashcd frontend
npm install
Running the Application
Start Backend
bashcd backend
npm run dev
Server will start on http://localhost:5000
Start Frontend
bashcd frontend
npm start
Application will open at http://localhost:3000
Usage
1. Browse Menu

View all available items with prices and stock levels
Filter by categories (if applicable)
Items show stock status (Available, Low Stock, Out of Stock)

2. Add to Cart

Click "Add to Cart" on any available item
Adjust quantities using +/- buttons
Cart icon shows total items
Cannot exceed available stock

3. Checkout Process

Click "Proceed to Checkout" when ready
15-minute countdown timer starts
Stock is immediately locked for your order
Review your order summary

4. Complete Payment

Choose payment method (Cash, UPI, Card, Wallet)
Order is confirmed and completed
Stock is permanently deducted
Order appears in history

5. Order History

Click "History" button to view past orders
See all completed orders with details
Use "Reorder" to quickly add items back to cart

Auto-Cancellation Feature
How it works:

When you proceed to checkout, a 15-minute timer starts
Stock is locked for your order during this time
You must complete payment within 15 minutes
If timer expires without payment:

Order is automatically cancelled
Stock is restored to inventory
You're redirected to menu with a notification



Visual Indicators:

Progress bar shows remaining time
Timer turns red in last 5 minutes
Warning messages appear as time runs low

Background Job:

Runs every minute on the server
Checks for expired pending orders
Automatically cancels and restores stock
Logs all actions in server console

API Endpoints
Menu

GET /api/menu - Get all menu items
GET /api/menu/available - Get in-stock items only
POST /api/menu - Create menu item
PUT /api/menu/:id - Update menu item
PATCH /api/menu/:id/stock - Update stock
DELETE /api/menu/:id - Delete menu item

Orders

POST /api/orders - Create order (locks stock)
GET /api/orders - Get all orders
GET /api/orders/:id - Get order by ID
GET /api/orders/user/:user_id - Get user orders
PATCH /api/orders/:id/payment - Complete payment
PATCH /api/orders/:id/pickup - Complete pickup
DELETE /api/orders/:id - Cancel order (restores stock)

Users

POST /api/users - Create user
GET /api/users - Get all users
GET /api/users/:id - Get user by ID
PUT /api/users/:id - Update user
DELETE /api/users/:id - Delete user

System

GET / - API status
GET /health - Health check

Adding Menu Items
Use Postman or any API client:
bashPOST http://localhost:5000/api/menu
Content-Type: application/json

{
  "name": "Burger",
  "description": "Delicious beef burger",
  "price": 150,
  "stock_count": 20
}
Repeat for all items you want to add.
Project Structure
canteen-ordering-system/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── menuController.js
│   │   ├── orderController.js
│   │   └── userController.js
│   ├── jobs/
│   │   └── autoCancelJob.js
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── MenuItem.js
│   │   ├── Order.js
│   │   └── User.js
│   ├── routes/
│   │   ├── menuRoutes.js
│   │   ├── orderRoutes.js
│   │   └── userRoutes.js
│   ├── .env
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   ├── tailwind.config.js
│   └── package.json
└── README.md
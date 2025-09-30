const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');

// Creating a new order
const createOrder = async (req, res, next) => {
  try {
    const { user_id, items } = req.body;

    // Validation
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Validate each item and calculate total
    let total_amount = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.menu_item_id || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Each item must have menu_item_id and valid quantity'
        });
      }

      // Check if menu item exists and has sufficient stock
      const menuItem = await MenuItem.findById(item.menu_item_id);
      
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          message: `Menu item with ID ${item.menu_item_id} not found`
        });
      }

      if (!menuItem.is_available || menuItem.stock_count < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${menuItem.name}. Available: ${menuItem.stock_count}`
        });
      }

      validatedItems.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        price: menuItem.price
      });

      total_amount += menuItem.price * item.quantity;
    }

    // Creating order with transaction (stock will be locked automatically)
    const order = await Order.create({
      user_id,
      items: validatedItems,
      total_amount
    });

    // Fetch complete order details
    const completeOrder = await Order.findById(order.id);

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Please complete payment within 15 minutes.',
      data: completeOrder
    });
  } catch (error) {
    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

// Get all orders
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.findAll();

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// Get order by ID
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Get orders by user ID
const getOrdersByUserId = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const orders = await Order.findByUserId(user_id);

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// Complete payment
const completePayment = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Checking if order exists
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Checking if order is still pending
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete payment. Order status is ${order.status}`
      });
    }

    // Updating order status
    const updatedOrder = await Order.updateStatus(id, 'paid', 'payment_completed_at');

    res.status(200).json({
      success: true,
      message: 'Payment completed successfully',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// Complete pickup
const completePickup = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Checking if order exists
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Checking if payment is completed
    if (order.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment must be completed before pickup'
      });
    }

    // Updating order status
    const updatedOrder = await Order.updateStatus(id, 'completed', 'pickup_completed_at');

    res.status(200).json({
      success: true,
      message: 'Order completed successfully',
      data: updatedOrder
    });
  } catch (error) {
    next(error);
  }
};

// Cancel order
const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Checking if order exists
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be cancelled
    if (order.status === 'completed' || order.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order. Order is already ${order.status}`
      });
    }

    // Canceling order (stock will be restored automatically)
    const cancelledOrder = await Order.cancel(id);

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully. Stock has been restored.',
      data: cancelledOrder
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrdersByUserId,
  completePayment,
  completePickup,
  cancelOrder
};
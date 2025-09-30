const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const mongoose = require('mongoose');

// Create a new order
const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { user_id, items } = req.body;

    // Validation
    if (!user_id) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    // Validate items and calculate total
    let total_amount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menu_item_id).session(session);
      
      if (!menuItem) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: `Menu item with ID ${item.menu_item_id} not found`
        });
      }

      if (!menuItem.is_available || menuItem.stock_count < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${menuItem.name}. Available: ${menuItem.stock_count}`
        });
      }

      // Decrement stock
      menuItem.stock_count -= item.quantity;
      menuItem.is_available = menuItem.stock_count > 0;
      await menuItem.save({ session });

      orderItems.push({
        menu_item_id: menuItem._id,
        menu_item_name: menuItem.name,
        quantity: item.quantity,
        price: menuItem.price
      });

      total_amount += menuItem.price * item.quantity;
    }

    // Set auto-cancel time to 15 minutes from now
    const autoCancelAt = new Date(Date.now() + 15 * 60 * 1000);

    // Create order
    const order = await Order.create([{
      user_id,
      items: orderItems,
      total_amount,
      auto_cancel_at: autoCancelAt
    }], { session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: 'Order created successfully. Please complete payment within 15 minutes.',
      data: order[0]
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// Get all orders
const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find()
      .populate('user_id', 'name email')
      .sort({ createdAt: -1 });

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
    const order = await Order.findById(id).populate('user_id', 'name email');

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
    const orders = await Order.find({ user_id }).sort({ createdAt: -1 });

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

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot complete payment. Order status is ${order.status}`
      });
    }

    order.status = 'paid';
    order.payment_completed_at = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment completed successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Complete pickup
const completePickup = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Payment must be completed before pickup'
      });
    }

    order.status = 'completed';
    order.pickup_completed_at = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order completed successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// Cancel order
const cancelOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const order = await Order.findById(id).session(session);

    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status === 'completed' || order.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order. Order is already ${order.status}`
      });
    }

    // Restore stock
    for (const item of order.items) {
      const menuItem = await MenuItem.findById(item.menu_item_id).session(session);
      if (menuItem) {
        menuItem.stock_count += item.quantity;
        menuItem.is_available = true;
        await menuItem.save({ session });
      }
    }

    order.status = 'cancelled';
    order.cancelled_at = new Date();
    await order.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully. Stock has been restored.',
      data: order
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
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
const MenuItem = require('../models/MenuItem');

// Creating a new menu item
const createMenuItem = async (req, res, next) => {
  try {
    const { name, description, price, stock_count } = req.body;

    // Validation
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Name and price are required'
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    if (stock_count < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock count cannot be negative'
      });
    }

    const menuItem = await MenuItem.create({
      name,
      description,
      price,
      stock_count: stock_count || 0
    });

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Get all menu items
const getAllMenuItems = async (req, res, next) => {
  try {
    const menuItems = await MenuItem.findAll();

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    next(error);
  }
};

// Get available menu items (in stock only)
const getAvailableMenuItems = async (req, res, next) => {
  try {
    const menuItems = await MenuItem.findAvailable();

    res.status(200).json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });
  } catch (error) {
    next(error);
  }
};

// Get menu item by ID
const getMenuItemById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.status(200).json({
      success: true,
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Updating menu item
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_count } = req.body;

    // Checking if menu item exists
    const existingItem = await MenuItem.findById(id);
    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Validation
    if (price !== undefined && price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be greater than 0'
      });
    }

    if (stock_count !== undefined && stock_count < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock count cannot be negative'
      });
    }

    const menuItem = await MenuItem.update(id, {
      name,
      description,
      price,
      stock_count
    });

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Updating stock 
const updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;

    // Validation
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
      });
    }

    if (operation && !['increment', 'decrement'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Operation must be either "increment" or "decrement"'
      });
    }

    const menuItem = await MenuItem.updateStock(
      id,
      quantity,
      operation || 'decrement'
    );

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: menuItem
    });
  } catch (error) {
    if (error.message === 'Insufficient stock') {
      return res.status(400).json({
        success: false,
        message: 'Insufficient stock available'
      });
    }
    next(error);
  }
};

// Deleting menu item
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findById(id);
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    await MenuItem.delete(id);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMenuItem,
  getAllMenuItems,
  getAvailableMenuItems,
  getMenuItemById,
  updateMenuItem,
  updateStock,
  deleteMenuItem
};
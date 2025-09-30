const MenuItem = require('../models/MenuItem');

// Create a new menu item
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
    const menuItems = await MenuItem.find().sort({ name: 1 });

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
    const menuItems = await MenuItem.find({
      is_available: true,
      stock_count: { $gt: 0 }
    }).sort({ name: 1 });

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

// Update menu item
const updateMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock_count } = req.body;

    const menuItem = await MenuItem.findByIdAndUpdate(
      id,
      { name, description, price, stock_count },
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Update stock
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

    const menuItem = await MenuItem.findById(id);
    
    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    if (operation === 'decrement') {
      if (menuItem.stock_count < quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock available'
        });
      }
      menuItem.stock_count -= quantity;
    } else {
      menuItem.stock_count += quantity;
    }

    menuItem.is_available = menuItem.stock_count > 0;
    await menuItem.save();

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      data: menuItem
    });
  } catch (error) {
    next(error);
  }
};

// Delete menu item
const deleteMenuItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findByIdAndDelete(id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

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
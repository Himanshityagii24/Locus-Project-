const express = require('express');
const router = express.Router();
const {
  createMenuItem,
  getAllMenuItems,
  getAvailableMenuItems,
  getMenuItemById,
  updateMenuItem,
  updateStock,
  deleteMenuItem
} = require('../controllers/menuController');


router.post('/', createMenuItem);


router.get('/', getAllMenuItems);

router.get('/available', getAvailableMenuItems);


router.get('/:id', getMenuItemById);


router.put('/:id', updateMenuItem);


router.patch('/:id/stock', updateStock);


router.delete('/:id', deleteMenuItem);

module.exports = router;
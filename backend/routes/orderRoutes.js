const express = require('express');
const router = express.Router();
const {
  createOrder,
  getAllOrders,
  getOrderById,
  getOrdersByUserId,
  completePayment,
  completePickup,
  cancelOrder
} = require('../controllers/orderController');


router.post('/', createOrder);


router.get('/', getAllOrders);


router.get('/:id', getOrderById);


router.get('/user/:user_id', getOrdersByUserId);


router.patch('/:id/payment', completePayment);


router.patch('/:id/pickup', completePickup);


router.delete('/:id', cancelOrder);

module.exports = router;
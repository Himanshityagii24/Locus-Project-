const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menu_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true
  },
  menu_item_name: String,
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  }
});

const orderSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  status: {
    type: String,
    enum: ['pending', 'paid', 'completed', 'cancelled'],
    default: 'pending'
  },
  total_amount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  payment_completed_at: Date,
  pickup_completed_at: Date,
  cancelled_at: Date,
  auto_cancel_at: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: true
});


orderSchema.index({ status: 1 });
orderSchema.index({ user_id: 1 });
orderSchema.index({ auto_cancel_at: 1, status: 1 });

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
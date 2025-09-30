const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  stock_count: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Stock count cannot be negative']
  },
  is_available: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});


menuItemSchema.pre('save', function(next) {
  this.is_available = this.stock_count > 0;
  next();
});


menuItemSchema.index({ is_available: 1 });
menuItemSchema.index({ name: 1 });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem;
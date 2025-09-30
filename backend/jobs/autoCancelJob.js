const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const mongoose = require('mongoose');

class AutoCancelJob {
  constructor(intervalMinutes = 1) {
    this.intervalMinutes = intervalMinutes;
    this.intervalId = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('  Auto-cancel job is already running');
      return;
    }

    console.log(` Starting auto-cancel job (runs every ${this.intervalMinutes} minute(s))`);
    
    this.cancelStaleOrders();

    this.intervalId = setInterval(() => {
      this.cancelStaleOrders();
    }, this.intervalMinutes * 60 * 1000);

    this.isRunning = true;
  }

  stop() {
    if (!this.isRunning) {
      console.log(' Auto-cancel job is not running');
      return;
    }

    clearInterval(this.intervalId);
    this.intervalId = null;
    this.isRunning = false;
    console.log('Auto-cancel job stopped');
  }

  async cancelStaleOrders() {
    const session = await mongoose.startSession();
    
    try {
      const currentTime = new Date().toISOString();
      console.log(`\n🔍 [${currentTime}] Checking for stale orders...`);

      // Find stale orders
      const staleOrders = await Order.find({
        status: 'pending',
        auto_cancel_at: { $lt: new Date() }
      });

      if (staleOrders.length === 0) {
        console.log(' No stale orders found');
        return;
      }

      console.log(` Found ${staleOrders.length} stale order(s) to cancel`);

      let successCount = 0;
      let failCount = 0;

      for (const order of staleOrders) {
        try {
          await session.startTransaction();

          // Restore stock
          for (const item of order.items) {
            const menuItem = await MenuItem.findById(item.menu_item_id).session(session);
            if (menuItem) {
              menuItem.stock_count += item.quantity;
              menuItem.is_available = true;
              await menuItem.save({ session });
            }
          }

          // Cancel order
          order.status = 'cancelled';
          order.cancelled_at = new Date();
          await order.save({ session });

          await session.commitTransaction();
          console.log(`   Cancelled order #${order._id} (Total: $${order.total_amount})`);
          successCount++;
        } catch (error) {
          await session.abortTransaction();
          console.error(`   Failed to cancel order #${order._id}:`, error.message);
          failCount++;
        }
      }

      console.log(`\nSummary: ${successCount} cancelled, ${failCount} failed`);
      
      if (successCount > 0) {
        console.log(' Stock has been restored for cancelled orders');
      }
    } catch (error) {
      console.error('Error in auto-cancel job:', error.message);
    } finally {
      session.endSession();
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalMinutes,
      nextRunIn: this.isRunning ? `${this.intervalMinutes} minute(s)` : 'Not scheduled'
    };
  }
}

const autoCancelJob = new AutoCancelJob(1);

module.exports = autoCancelJob;
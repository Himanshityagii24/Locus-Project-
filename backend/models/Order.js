const pool = require('../config/db');

class Order {
  static async create({ user_id, items, total_amount }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Set auto-cancel time to 15 minutes from now
      const autoCancelAt = new Date(Date.now() + 15 * 60 * 1000);

      // Create order
      const orderQuery = `
        INSERT INTO orders (user_id, status, total_amount, auto_cancel_at)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      const orderResult = await client.query(orderQuery, [
        user_id,
        'pending',
        total_amount,
        autoCancelAt
      ]);
      const order = orderResult.rows[0];

      // Create order items and lock stock
      for (const item of items) {
        // Lock menu item and decrement stock
        const stockQuery = `
          UPDATE menu_items
          SET stock_count = stock_count - $1,
              is_available = (stock_count - $1) > 0
          WHERE id = $2 AND stock_count >= $1
          RETURNING *
        `;
        const stockResult = await client.query(stockQuery, [
          item.quantity,
          item.menu_item_id
        ]);

        if (stockResult.rows.length === 0) {
          throw new Error(`Insufficient stock for item ID ${item.menu_item_id}`);
        }

        // Insert order item
        const orderItemQuery = `
          INSERT INTO order_items (order_id, menu_item_id, quantity, price)
          VALUES ($1, $2, $3, $4)
        `;
        await client.query(orderItemQuery, [
          order.id,
          item.menu_item_id,
          item.quantity,
          item.price
        ]);
      }

      await client.query('COMMIT');
      return order;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id) {
    const query = `
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'menu_item_id', oi.menu_item_id,
                 'menu_item_name', mi.name,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.id = $1
      GROUP BY o.id
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findByUserId(user_id) {
    const query = `
      SELECT o.*, 
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'menu_item_id', oi.menu_item_id,
                 'menu_item_name', mi.name,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query, [user_id]);
    return result.rows;
  }

  static async findAll() {
    const query = `
      SELECT o.*, 
             u.name as user_name,
             u.email as user_email,
             json_agg(
               json_build_object(
                 'id', oi.id,
                 'menu_item_id', oi.menu_item_id,
                 'menu_item_name', mi.name,
                 'quantity', oi.quantity,
                 'price', oi.price
               )
             ) as items
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      GROUP BY o.id, u.name, u.email
      ORDER BY o.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async updateStatus(id, status, timestampField = null) {
    let query = `
      UPDATE orders
      SET status = $1
    `;
    const values = [status];

    if (timestampField) {
      query += `, ${timestampField} = CURRENT_TIMESTAMP`;
    }

    query += ' WHERE id = $2 RETURNING *';
    values.push(id);

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async cancel(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get order items
      const orderItemsQuery = `
        SELECT menu_item_id, quantity
        FROM order_items
        WHERE order_id = $1
      `;
      const itemsResult = await client.query(orderItemsQuery, [id]);

      // Restore stock for each item
      for (const item of itemsResult.rows) {
        const restoreStockQuery = `
          UPDATE menu_items
          SET stock_count = stock_count + $1,
              is_available = true
          WHERE id = $2
        `;
        await client.query(restoreStockQuery, [item.quantity, item.menu_item_id]);
      }

      // Update order status
      const updateOrderQuery = `
        UPDATE orders
        SET status = 'cancelled',
            cancelled_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await client.query(updateOrderQuery, [id]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findStaleOrders() {
    const query = `
      SELECT * FROM orders
      WHERE status = 'pending'
      AND auto_cancel_at < CURRENT_TIMESTAMP
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

module.exports = Order;
const pool = require('../config/db');

class OrderItem {
  static async create({ order_id, menu_item_id, quantity, price }) {
    const query = `
      INSERT INTO order_items (order_id, menu_item_id, quantity, price)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [order_id, menu_item_id, quantity, price];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findByOrderId(order_id) {
    const query = `
      SELECT oi.*, mi.name as menu_item_name, mi.description
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = $1
    `;
    const result = await pool.query(query, [order_id]);
    return result.rows;
  }

  static async findById(id) {
    const query = `
      SELECT oi.*, mi.name as menu_item_name, mi.description
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async delete(id) {
    const query = 'DELETE FROM order_items WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = OrderItem;
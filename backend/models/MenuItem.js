const pool = require('../config/db');

class MenuItem {
  static async create({ name, description, price, stock_count }) {
    const query = `
      INSERT INTO menu_items (name, description, price, stock_count, is_available)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const is_available = stock_count > 0;
    const values = [name, description, price, stock_count, is_available];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id) {
    const query = 'SELECT * FROM menu_items WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  static async findAll() {
    const query = 'SELECT * FROM menu_items ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async findAvailable() {
    const query = `
      SELECT * FROM menu_items 
      WHERE is_available = true AND stock_count > 0
      ORDER BY name
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id, { name, description, price, stock_count }) {
    const query = `
      UPDATE menu_items
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          stock_count = COALESCE($4, stock_count),
          is_available = CASE 
            WHEN $4 IS NOT NULL THEN $4 > 0 
            ELSE is_available 
          END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    const values = [name, description, price, stock_count, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async updateStock(id, quantity, operation = 'decrement') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Lock the row for update
      const lockQuery = 'SELECT * FROM menu_items WHERE id = $1 FOR UPDATE';
      const itemResult = await client.query(lockQuery, [id]);
      
      if (itemResult.rows.length === 0) {
        throw new Error('Menu item not found');
      }

      const item = itemResult.rows[0];
      let newStock;

      if (operation === 'decrement') {
        newStock = item.stock_count - quantity;
        if (newStock < 0) {
          throw new Error('Insufficient stock');
        }
      } else {
        newStock = item.stock_count + quantity;
      }

      const updateQuery = `
        UPDATE menu_items
        SET stock_count = $1,
            is_available = $1 > 0,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      const result = await client.query(updateQuery, [newStock, id]);
      
      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const query = 'DELETE FROM menu_items WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = MenuItem;
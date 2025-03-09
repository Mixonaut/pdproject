// auth.js - User authentication using MySQL database
const bcrypt = require('bcrypt');
const db = require('./db');

/**
 * Register a new user in the database
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @param {number} roleId - Role ID (1=resident, 2=staff, 3=manager, 4=admin)
 * @param {string} email - Email address (optional)
 * @returns {Promise<number>} - The ID of the newly created user
 */
async function registerUser(username, password, roleId, email = null) {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert the user into the database
    const sql = `
      INSERT INTO users (username, password_hash, role_id, email) 
      VALUES (?, ?, ?, ?)
    `;
    
    const result = await db.query(sql, [username, hashedPassword, roleId, email]);
    console.log(`User ${username} registered successfully`);
    return result.insertId;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Authenticate a user by username and password
 * @param {string} username - Username
 * @param {string} password - Plain text password
 * @returns {Promise<Object>} - Authentication result
 */
async function loginUser(username, password) {
  try {
    // Get the user from the database
    const sql = `
      SELECT u.user_id, u.username, u.password_hash, r.role_name 
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      WHERE u.username = ?
    `;
    
    const users = await db.query(sql, [username]);
    
    if (users.length === 0) {
      return { success: false, message: 'Cannot find user' };
    }
    
    const user = users[0];
    
    // Compare the password
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (match) {
      // Return different responses based on role
      if (user.role_name === 'admin' || user.role_name === 'manager') {
        return { 
          success: true, 
          message: 'Sucadmin', 
          user_id: user.user_id, 
          role: user.role_name 
        };
      } else {
        return { 
          success: true, 
          message: 'Success', 
          user_id: user.user_id, 
          role: user.role_name 
        };
      }
    } else {
      return { success: false, message: 'Not Allowed' };
    }
  } catch (error) {
    console.error('Error logging in user:', error);
    throw error;
  }
}

/**
 * Create default users for testing
 */
async function createDefaultUsers() {
  try {
    // Check if users already exist
    const userCheck = await db.query('SELECT COUNT(*) as count FROM users');
    
    if (userCheck[0].count === 0) {
      // Get role IDs
      const roles = await db.query('SELECT role_id, role_name FROM roles');
      
      const roleMap = {};
      roles.forEach(role => {
        roleMap[role.role_name] = role.role_id;
      });
      
      // Create a resident user
      await registerUser('john', 'password123', roleMap.resident, 'john@example.com');
      
      // Create an admin user
      await registerUser('admin', 'admin123', roleMap.admin, 'admin@example.com');
      
      console.log('Default users created successfully');
    } else {
      console.log('Users already exist, skipping default user creation');
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
}

module.exports = {
  registerUser,
  loginUser,
  createDefaultUsers
};
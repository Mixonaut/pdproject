// createadmin.js - Create an admin user
const bcrypt = require('bcrypt');
const db = require('./db');

async function createAdminUser() {
  try {
    // Check if database connection works
    await db.testConnection();
    console.log('Connected to database');
    
    // Check if roles exist
    const roles = await db.query('SELECT * FROM roles');
    if (roles.length === 0) {
      console.log('Creating roles...');
      await db.query(`
        INSERT IGNORE INTO roles (role_name) VALUES 
        ('resident'), ('staff'), ('manager'), ('admin')
      `);
    }
    
    // Get admin role ID
    const adminRole = await db.query('SELECT role_id FROM roles WHERE role_name = ?', ['admin']);
    if (adminRole.length === 0) {
      throw new Error('Admin role not found');
    }
    
    const adminRoleId = adminRole[0].role_id;
    console.log(`Found admin role with ID: ${adminRoleId}`);
    
    // Check if admin user exists
    const existingAdmin = await db.query('SELECT * FROM users WHERE username = ?', ['admin']);
    
    if (existingAdmin.length > 0) {
      console.log('Admin user already exists. Creating a new admin user with different username.');
      
      // Create a new admin user with a different username
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query(
        'INSERT INTO users (username, password_hash, role_id, email) VALUES (?, ?, ?, ?)',
        ['admin2', hashedPassword, adminRoleId, 'admin2@example.com']
      );
      
      console.log('Created new admin user: admin2 / admin123');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.query(
        'INSERT INTO users (username, password_hash, role_id, email) VALUES (?, ?, ?, ?)',
        ['admin', hashedPassword, adminRoleId, 'admin@example.com']
      );
      
      console.log('Created admin user: admin / admin123');
    }
    
    // List all users
    const allUsers = await db.query(`
      SELECT u.user_id, u.username, r.role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id
    `);
    
    console.log('All users in database:');
    console.table(allUsers);
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    process.exit();
  }
}

// Run the function
createAdminUser();

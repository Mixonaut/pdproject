// create-accounts.js - Create test accounts for the Smart Home System
const bcrypt = require('bcrypt');
const db = require('./db');

async function createTestAccounts() {
  try {
    // Test database connection
    await db.testConnection();
    console.log('Connected to database');
    
    // Ensure roles exist
    const roles = await db.query('SELECT * FROM roles');
    if (roles.length === 0) {
      console.log('Creating roles...');
      await db.query(`
        INSERT IGNORE INTO roles (role_name) VALUES 
        ('resident'), ('staff'), ('manager'), ('admin')
      `);
      console.log('Roles created successfully');
    } else {
      console.log('Roles already exist:');
      console.table(roles);
    }
    
    // Get role IDs
    const roleMap = {};
    const updatedRoles = await db.query('SELECT * FROM roles');
    updatedRoles.forEach(role => {
      roleMap[role.role_name] = role.role_id;
    });
    console.log('Role mapping:', roleMap);
    
    // Create resident account
    const residentUser = 'resident1';
    const residentPassword = 'password123';
    await createUser(residentUser, residentPassword, roleMap.resident);

    // Create staff account
    const staffUser = 'staff1';
    const staffPassword = 'password123';
    await createUser(staffUser, staffPassword, roleMap.staff);
    
    // Create admin account
    const adminUser = 'admin1';
    const adminPassword = 'admin123';
    await createUser(adminUser, adminPassword, roleMap.admin);
    
    console.log('Test accounts created successfully');
    
    // List all users
    const users = await db.query(`
      SELECT u.user_id, u.username, r.role_name 
      FROM users u 
      JOIN roles r ON u.role_id = r.role_id
    `);
    
    console.log('All users in database:');
    console.table(users);
    
  } catch (error) {
    console.error('Error creating test accounts:', error);
  } finally {
    process.exit();
  }
}

async function createUser(username, password, roleId) {
  try {
    // Check if user already exists
    const existingUser = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (existingUser.length > 0) {
      console.log(`User ${username} already exists`);
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await db.query(
      'INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)',
      [username, hashedPassword, roleId]
    );
    
    console.log(`User ${username} created with ID ${result.insertId}`);
    return result.insertId;
  } catch (error) {
    console.error(`Error creating user ${username}:`, error);
    throw error;
  }
}

// Run the function
createTestAccounts();

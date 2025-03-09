// debuglogin.js - Test the login process specifically
const auth = require('./auth');
const bcrypt = require('bcrypt');
const db = require('./db');

async function debugLogin() {
  try {
    // Test admin login manually
    console.log('Testing admin login...');
    
    // 1. Get the admin user directly from the database
    const adminUser = await db.query(
      'SELECT * FROM users WHERE username = ?', 
      ['admin']
    );
    
    if (adminUser.length === 0) {
      console.error('❌ Admin user not found in the database');
      return;
    }
    
    console.log('Admin user found in database:');
    console.log('User ID:', adminUser[0].user_id);
    console.log('Username:', adminUser[0].username);
    console.log('Role ID:', adminUser[0].role_id);
    
    // 2. Try to verify the password directly
    const storedHash = adminUser[0].password_hash;
    const testPassword = 'admin123';
    
    console.log('Stored password hash:', storedHash);
    
    const passwordMatch = await bcrypt.compare(testPassword, storedHash);
    console.log(`Password 'admin123' matches: ${passwordMatch}`);
    
    // 3. Use the auth.loginUser function
    console.log('\nTesting auth.loginUser with admin/admin123:');
    const loginResult = await auth.loginUser('admin', 'admin123');
    console.log('Login result:', loginResult);
    
    // 4. Check if the role name is correctly set
    const roleInfo = await db.query(
      'SELECT * FROM roles WHERE role_id = ?',
      [adminUser[0].role_id]
    );
    
    if (roleInfo.length > 0) {
      console.log('Role name for this user:', roleInfo[0].role_name);
    } else {
      console.error('❌ Role not found for role_id:', adminUser[0].role_id);
    }
    
    console.log('\nTesting what the server would return:');
    let returnValue;
    
    if (loginResult.success) {
      if (loginResult.role === 'admin' || loginResult.role === 'manager') {
        returnValue = 'Sucadmin';
      } else {
        returnValue = 'Success';
      }
      console.log('Server would return:', returnValue);
    } else {
      console.log('Server would return failure message:', loginResult.message);
    }
    
  } catch (error) {
    console.error('Error debugging login:', error);
  } finally {
    process.exit();
  }
}

// Run the test
debugLogin();

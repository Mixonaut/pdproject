// testauth.js - Test authentication functionality
const auth = require('./auth');
const db = require('./db');

async function testAuthentication() {
  try {
    // Test database connection first
    const connected = await db.testConnection();
    if (!connected) {
      console.error('❌ Database connection failed. Cannot proceed with auth testing.');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful. Testing authentication...');
    
    // Create test user if it doesn't exist
    try {
      // Check if roles exist
      const roles = await db.query('SELECT * FROM roles');
      if (roles.length === 0) {
        console.log('Creating roles...');
        await db.query(`
          INSERT IGNORE INTO roles (role_name) VALUES 
          ('resident'), ('staff'), ('manager'), ('admin')
        `);
      }
      
      // Check if test user exists
      const testUser = await db.query('SELECT * FROM users WHERE username = ?', ['testuser']);
      
      if (testUser.length === 0) {
        console.log('Creating test user...');
        // Create a test user (resident role = 1)
        await auth.registerUser('testuser', 'password123', 1, 'test@example.com');
        console.log('✅ Test user created successfully');
      } else {
        console.log('✅ Test user already exists');
      }
      
      // Test login with correct credentials
      console.log('Testing login with correct credentials...');
      const loginSuccess = await auth.loginUser('testuser', 'password123');
      
      if (loginSuccess.success) {
        console.log('✅ Login successful!', loginSuccess);
      } else {
        console.error('❌ Login failed with correct credentials:', loginSuccess.message);
      }
      
      // Test login with incorrect password
      console.log('Testing login with incorrect password...');
      const loginWrongPass = await auth.loginUser('testuser', 'wrongpassword');
      
      if (!loginWrongPass.success) {
        console.log('✅ Login correctly failed with wrong password:', loginWrongPass.message);
      } else {
        console.error('❌ Login unexpectedly succeeded with wrong password');
      }
      
      // Test login with non-existent user
      console.log('Testing login with non-existent user...');
      const loginWrongUser = await auth.loginUser('nonexistentuser', 'password123');
      
      if (!loginWrongUser.success) {
        console.log('✅ Login correctly failed with non-existent user:', loginWrongUser.message);
      } else {
        console.error('❌ Login unexpectedly succeeded with non-existent user');
      }
      
      console.log('✅ Authentication tests completed successfully!');
    } catch (error) {
      console.error('❌ Error during authentication testing:', error);
    }
  } catch (error) {
    console.error('❌ Error in test script:', error);
  } finally {
    // Exit the process when done
    process.exit();
  }
}

// Run the test
testAuthentication();

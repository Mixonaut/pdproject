// testdb.js - Test database connection
const db = require("./db");

async function testDatabaseConnection() {
  try {
    // Test basic connection
    const connected = await db.testConnection();

    if (connected) {
      console.log("✅ Successfully connected to the database!");

      // Test a simple query to verify further functionality
      try {
        // Check if roles table exists by querying it
        const roles = await db.query("SELECT * FROM roles LIMIT 5");
        console.log("✅ Successfully queried roles table:");
        console.table(roles);

        // Check if rooms table exists
        const rooms = await db.query("SELECT * FROM rooms LIMIT 5");
        console.log("✅ Successfully queried rooms table:");
        console.table(rooms);
      } catch (queryError) {
        console.log("⚠️ Tables may not be created yet. Creating them now...");

        // Try to create tables based on your existing SQL
        try {
          // First create roles table
          await db.query(`
            CREATE TABLE IF NOT EXISTS roles (
              role_id INT PRIMARY KEY AUTO_INCREMENT,
              role_name VARCHAR(20) NOT NULL UNIQUE
            )
          `);
          console.log("✅ Roles table created or already exists");

          // Insert default roles
          await db.query(`
            INSERT IGNORE INTO roles (role_name) VALUES 
            ('resident'), ('staff'), ('manager'), ('admin')
          `);
          console.log("✅ Default roles added");

          // Create other tables according to your schema
          // Users table
          await db.query(`
            CREATE TABLE IF NOT EXISTS users (
              user_id INT PRIMARY KEY AUTO_INCREMENT,
              username VARCHAR(50) NOT NULL UNIQUE,
              password_hash VARCHAR(255) NOT NULL,
              role_id INT NOT NULL,
              email VARCHAR(100),
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              FOREIGN KEY (role_id) REFERENCES roles(role_id)
            )
          `);
          console.log("✅ Users table created or already exists");

          // Rooms table
          await db.query(`
            CREATE TABLE IF NOT EXISTS rooms (
              room_id INT PRIMARY KEY AUTO_INCREMENT,
              room_number VARCHAR(10) NOT NULL UNIQUE,
              description TEXT
            )
          `);
          console.log("✅ Rooms table created or already exists");

          // Alerts table
          await db.query(`
            CREATE TABLE IF NOT EXISTS alerts (
              alert_id INT PRIMARY KEY AUTO_INCREMENT,
              room_id INT NOT NULL,
              user_id INT NULL,
              alert_type VARCHAR(50) NOT NULL,
              message TEXT NOT NULL,
              status VARCHAR(20) DEFAULT 'pending',
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              resolved_at TIMESTAMP NULL,
              FOREIGN KEY (room_id) REFERENCES rooms(room_id),
              FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
          `);
          console.log("✅ Alerts table created or already exists");

          // Add some test rooms if none exist
          const roomCount = await db.query(
            "SELECT COUNT(*) as count FROM rooms"
          );
          if (roomCount[0].count === 0) {
            await db.query(`
              INSERT INTO rooms (room_number, description) VALUES 
              ('101', 'Single room on first floor'),
              ('102', 'Single room on first floor'),
              ('103', 'Double room on first floor'),
              ('201', 'Single room on second floor'),
              ('202', 'Double room on second floor')
            `);
            console.log("✅ Test rooms added");
          }

          console.log("✅ Basic database setup completed successfully!");
        } catch (setupError) {
          console.error("❌ Error setting up database tables:", setupError);
        }
      }
    } else {
      console.error("❌ Database connection test failed!");
    }
  } catch (error) {
    console.error("❌ Error testing database connection:", error);
  } finally {
    // Exit the process when done
    process.exit();
  }
}

// Run the test
testDatabaseConnection();

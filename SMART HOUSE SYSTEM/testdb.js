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

        try {
          // 1. Create roles table (no dependencies)
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

          // 2. Create users table (depends on roles)
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

          // 3. Create user_details table (depends on users)
          await db.query(`
            CREATE TABLE IF NOT EXISTS user_details (
              user_id INT PRIMARY KEY,
              first_name VARCHAR(50),
              last_name VARCHAR(50),
              room_number VARCHAR(10),
              phone VARCHAR(20),
              status ENUM('active', 'inactive') DEFAULT 'active',
              FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
          `);
          console.log("✅ User details table created or already exists");

          // 4. Create rooms table (no dependencies)
          await db.query(`
            CREATE TABLE IF NOT EXISTS rooms (
              room_id INT PRIMARY KEY AUTO_INCREMENT,
              room_number VARCHAR(10) NOT NULL UNIQUE,
              description TEXT,
              status ENUM('occupied', 'vacant', 'maintenance') DEFAULT 'vacant'
            )
          `);
          console.log("✅ Rooms table created or already exists");

          // 5. Create devices table (depends on rooms)
          await db.query(`
            CREATE TABLE IF NOT EXISTS devices (
              device_id INT PRIMARY KEY AUTO_INCREMENT,
              room_id INT NOT NULL,
              device_type VARCHAR(50) NOT NULL,
              device_name VARCHAR(100) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
            )
          `);
          console.log("✅ Devices table created or already exists");

          // 6. Create device_status table (depends on devices)
          await db.query(`
            CREATE TABLE IF NOT EXISTS device_status (
              status_id INT PRIMARY KEY AUTO_INCREMENT,
              device_id INT NOT NULL,
              status VARCHAR(20) NOT NULL,
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
            )
          `);
          console.log("✅ Device status table created or already exists");

          // 7. Create energy_usage table (depends on devices and rooms)
          await db.query(`
            CREATE TABLE IF NOT EXISTS energy_usage (
              usage_id INT PRIMARY KEY AUTO_INCREMENT,
              device_id INT NOT NULL,
              room_id INT NOT NULL,
              energy_consumed DECIMAL(10,2) NOT NULL,
              timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE,
              FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE
            )
          `);
          console.log("✅ Energy usage table created or already exists");

          // 8. Create alerts table (depends on rooms and users)
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
              FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
              FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
            )
          `);
          console.log("✅ Alerts table created or already exists");

          // Add some test rooms if none exist
          const roomCount = await db.query(
            "SELECT COUNT(*) as count FROM rooms"
          );
          if (roomCount[0].count === 0) {
            await db.query(`
              INSERT INTO rooms (room_number, description, status) VALUES 
              ('101', 'Single room on first floor', 'vacant'),
              ('102', 'Single room on first floor', 'vacant'),
              ('103', 'Double room on first floor', 'vacant'),
              ('201', 'Single room on second floor', 'vacant'),
              ('202', 'Double room on second floor', 'vacant')
            `);
            console.log("✅ Test rooms added");
          }

          // Add indexes for better query performance
          await db.query(`
            CREATE INDEX IF NOT EXISTS idx_device_status_timestamp ON device_status(device_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_energy_usage_timestamp ON energy_usage(room_id, timestamp);
            CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status, created_at);
          `);
          console.log("✅ Performance indexes created");

          console.log("✅ Database initialization completed successfully!");
        } catch (setupError) {
          console.error("❌ Error setting up database tables:", setupError);
          throw setupError;
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

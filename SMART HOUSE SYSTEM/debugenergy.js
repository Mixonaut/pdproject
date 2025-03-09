// debugenergy.js - Debug the energy service issues
const db = require('./db');
const energyService = require('./energyService');

async function debugEnergyService() {
  try {
    console.log('Testing database connection...');
    await db.testConnection();
    console.log('Database connection successful.');
    
    // Get test room ID
    const rooms = await db.query('SELECT * FROM rooms LIMIT 1');
    if (rooms.length === 0) {
      console.error('No rooms found in database. Please run testservices.js first to create test data.');
      process.exit(1);
    }
    
    const roomId = rooms[0].room_id;
    console.log(`Using room ID: ${roomId}`);
    
    // Try to get energy summary directly from the database
    console.log('\nTesting direct database query for energy summary...');
    try {
      const rawQuery = `
        SELECT 
          SUM(energy_consumed) as total_energy,
          AVG(energy_consumed) as average_energy,
          MAX(energy_consumed) as peak_energy
        FROM energy_usage
        WHERE room_id = ? AND DATE(timestamp) = CURDATE()
      `;
      
      const result = await db.query(rawQuery, [roomId]);
      console.log('Raw database query result:');
      console.log(JSON.stringify(result, null, 2));
      console.log('Result data types:');
      
      if (result.length > 0) {
        for (const key in result[0]) {
          console.log(`${key}: ${typeof result[0][key]}, Value: ${result[0][key]}`);
        }
      } else {
        console.log('No data returned from query.');
      }
    } catch (error) {
      console.error('Error executing direct query:', error);
    }
    
    // Try the energyService method
    console.log('\nTesting energyService.getEnergySummary method...');
    try {
      const summary = await energyService.getEnergySummary(roomId, 'day');
      console.log('Summary result:');
      console.log(JSON.stringify(summary, null, 2));
      
      if (summary) {
        console.log('Summary data types:');
        for (const key in summary) {
          console.log(`${key}: ${typeof summary[key]}, Value: ${summary[key]}`);
          
          // Try formatting each value safely
          try {
            const formatted = typeof summary[key] === 'number' 
              ? summary[key].toFixed(2)
              : summary[key] ? summary[key].toString() : '0.00';
            console.log(`  Formatted: ${formatted}`);
          } catch (formatError) {
            console.error(`  Error formatting ${key}:`, formatError);
          }
        }
      } else {
        console.log('No summary data returned.');
      }
    } catch (error) {
      console.error('Error calling energyService.getEnergySummary:', error);
    }
    
    // Check if there's any energy_usage data for this room
    console.log('\nChecking for energy_usage data...');
    try {
      const countQuery = 'SELECT COUNT(*) as count FROM energy_usage WHERE room_id = ?';
      const countResult = await db.query(countQuery, [roomId]);
      console.log(`Found ${countResult[0].count} energy_usage records for room ${roomId}.`);
      
      if (countResult[0].count === 0) {
        console.log('No energy data found. Generating test data...');
        
        // Get a device for this room
        const deviceQuery = 'SELECT device_id FROM devices WHERE room_id = ? LIMIT 1';
        const deviceResult = await db.query(deviceQuery, [roomId]);
        
        if (deviceResult.length > 0) {
          const deviceId = deviceResult[0].device_id;
          console.log(`Using device ID: ${deviceId}`);
          
          // Generate test data
          await energyService.generateTestData(roomId, deviceId, 24);
          console.log('Test data generated successfully.');
          
          // Try getting the summary again
          console.log('\nRetrying energyService.getEnergySummary method...');
          const newSummary = await energyService.getEnergySummary(roomId, 'day');
          console.log('New summary result:');
          console.log(JSON.stringify(newSummary, null, 2));
        } else {
          console.log('No devices found for this room.');
        }
      }
    } catch (error) {
      console.error('Error checking energy_usage data:', error);
    }
    
  } catch (error) {
    console.error('Error during debugging:', error);
  } finally {
    process.exit();
  }
}

// Run the debug function
debugEnergyService();

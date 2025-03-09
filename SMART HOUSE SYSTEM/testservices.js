// testservices.js - Test energy and device services
const db = require('./db');
const energyService = require('./energyService');
const deviceService = require('./deviceService');

async function testServices() {
  try {
    // Test database connection
    const connected = await db.testConnection();
    if (!connected) {
      console.error('❌ Database connection failed. Cannot proceed with testing.');
      process.exit(1);
    }
    
    console.log('✅ Database connection successful.');
    
    // Create test room if needed
    let testRoomId;
    const existingRooms = await db.query('SELECT * FROM rooms');
    
    if (existingRooms.length > 0) {
      testRoomId = existingRooms[0].room_id;
      console.log(`Using existing room: ${existingRooms[0].room_number} (ID: ${testRoomId})`);
    } else {
      // Create a test room
      const insertResult = await db.query(
        'INSERT INTO rooms (room_number, description) VALUES (?, ?)',
        ['TEST101', 'Test Room for Services']
      );
      testRoomId = insertResult.insertId;
      console.log(`✅ Created test room with ID: ${testRoomId}`);
    }
    
    // Test device service
    console.log('\n📱 Testing Device Service...');
    
    // Create test devices
    const testDevices = [
      { type: 'light', name: 'Test Light' },
      { type: 'thermostat', name: 'Test Thermostat' }
    ];
    
    const deviceIds = [];
    
    for (const device of testDevices) {
      const deviceId = await deviceService.addDevice(testRoomId, device.type, device.name);
      deviceIds.push(deviceId);
      console.log(`✅ Created ${device.name} with ID: ${deviceId}`);
      
      // Update device status
      await deviceService.updateDeviceStatus(deviceId, 'on');
      console.log(`✅ Set ${device.name} status to 'on'`);
    }
    
    // Get devices by room
    const devices = await deviceService.getDevicesByRoom(testRoomId);
    console.log(`✅ Retrieved ${devices.length} devices for room ${testRoomId}`);
    
    // Get device status history
    const statusHistory = await deviceService.getDeviceStatusHistory(deviceIds[0]);
    console.log(`✅ Retrieved status history for device ${deviceIds[0]}`);
    
    // Test energy service
    console.log('\n⚡ Testing Energy Service...');
    
    // Generate test energy data
    for (const deviceId of deviceIds) {
      // Generate 24 hours of data
      await energyService.generateTestData(testRoomId, deviceId, 24);
      console.log(`✅ Generated 24 hours of energy data for device ${deviceId}`);
    }
    
    // Get energy usage by room
    const energyData = await energyService.getEnergyUsageByRoom(testRoomId, 'day');
    console.log(`✅ Retrieved energy usage for room ${testRoomId} with ${energyData.length} time periods`);
    
    // Get energy summary
    const energySummary = await energyService.getEnergySummary(testRoomId, 'day');
    console.log('✅ Energy summary:');
    
    // Safe formatting function that handles any type
    const formatValue = (value) => {
      if (value === null || value === undefined) return '0.00';
      if (typeof value === 'number') return value.toFixed(2);
      return value.toString();
    };
    
    // Print summary data safely
    console.log(`   - Total energy: ${formatValue(energySummary.total_energy)} kWh`);
    console.log(`   - Average energy: ${formatValue(energySummary.average_energy)} kWh`);
    console.log(`   - Peak energy: ${formatValue(energySummary.peak_energy)} kWh`);
    
    // Get energy by device type
    const deviceTypeEnergy = await energyService.getEnergyByDeviceType(testRoomId, 'day');
    console.log(`✅ Retrieved energy usage by device type with ${deviceTypeEnergy.length} types`);
    
    // Clean up test data if requested
    const shouldCleanup = process.argv.includes('--cleanup');
    if (shouldCleanup) {
      console.log('\n🧹 Cleaning up test data...');
      
      // Delete test devices
      for (const deviceId of deviceIds) {
        await deviceService.removeDevice(deviceId);
        console.log(`✅ Removed device ${deviceId}`);
      }
      
      console.log('✅ Test data cleanup complete');
    } else {
      console.log('\n🔍 Test data has been preserved for inspection.');
      console.log('   Run with --cleanup flag to remove test data.');
    }
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    process.exit();
  }
}

// Run the test
testServices();

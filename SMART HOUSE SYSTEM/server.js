// server.js - Main application server
const express = require('express');
const app = express();
const path = require('path');
const db = require('./db');
const auth = require('./auth');

// Import service modules
const energyService = require('./energyService');
const deviceService = require('./deviceService');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Initialize database and create default users
async function initializeApp() {
  try {
    // Test database connection
    const connected = await db.testConnection();
    if (connected) {
      console.log('Connected to database successfully');
      
      // Create default users if needed
      await auth.createDefaultUsers();
    } else {
      console.error('Failed to connect to database');
    }
  } catch (error) {
    console.error('Error initializing app:', error);
  }
}

// Initialize the application
initializeApp();

// Login route - uses MySQL database
app.post('/users/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    console.log(`Login attempt for user: ${name}`);
    
    const result = await auth.loginUser(name, password);
    console.log('Login result:', result);
    
    if (result.success) {
      console.log(`User ${name} logged in successfully as ${result.role}`);
      res.send(result.message);
    } else {
      console.log(`Login failed for user: ${name}`);
      res.status(400).send(result.message);
    }
  } catch (error) {
    console.error('Server error during login:', error);
    res.status(500).send('Server error');
  }
});

// User registration route
app.post('/users', async (req, res) => {
  try {
    const { name, password, isAdmin } = req.body;
    
    // Convert boolean isAdmin to role_id (4 for admin, 1 for resident)
    const roleId = isAdmin ? 4 : 1;
    
    const userId = await auth.registerUser(name, password, roleId);
    res.status(201).send({ userId });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Failed to register user');
  }
});

// Get all users route (for admin purposes)
app.get('/users', async (req, res) => {
  try {
    const users = await db.query(`
      SELECT u.user_id, u.username, r.role_name, u.email, u.created_at 
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
    `);
    
    // Remove sensitive information like password_hash
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Room routes
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await db.query('SELECT * FROM rooms');
    res.json(rooms);
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// Create a new room
app.post('/api/rooms', async (req, res) => {
  try {
    const { roomNumber, description } = req.body;
    
    const sql = 'INSERT INTO rooms (room_number, description) VALUES (?, ?)';
    const result = await db.query(sql, [roomNumber, description]);
    
    res.status(201).json({ 
      roomId: result.insertId,
      message: 'Room created successfully' 
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Device management routes
app.get('/api/rooms/:roomId/devices', async (req, res) => {
  try {
    const { roomId } = req.params;
    const devices = await deviceService.getDevicesByRoom(roomId);
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

app.post('/api/rooms/:roomId/devices', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { deviceType, deviceName } = req.body;
    
    const deviceId = await deviceService.addDevice(roomId, deviceType, deviceName);
    res.status(201).json({ 
      deviceId,
      message: 'Device added successfully' 
    });
  } catch (error) {
    console.error('Error adding device:', error);
    res.status(500).json({ error: 'Failed to add device' });
  }
});

app.put('/api/devices/:deviceId/status', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { status } = req.body;
    
    await deviceService.updateDeviceStatus(deviceId, status);
    res.json({ message: 'Device status updated successfully' });
  } catch (error) {
    console.error('Error updating device status:', error);
    res.status(500).json({ error: 'Failed to update device status' });
  }
});

app.delete('/api/devices/:deviceId', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const success = await deviceService.removeDevice(deviceId);
    
    if (success) {
      res.json({ message: 'Device removed successfully' });
    } else {
      res.status(404).json({ error: 'Device not found' });
    }
  } catch (error) {
    console.error('Error removing device:', error);
    res.status(500).json({ error: 'Failed to remove device' });
  }
});

app.get('/api/devices/:deviceId/history', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const history = await deviceService.getDeviceStatusHistory(deviceId, limit);
    res.json(history);
  } catch (error) {
    console.error('Error fetching device history:', error);
    res.status(500).json({ error: 'Failed to fetch device history' });
  }
});

// Energy monitoring routes
app.get('/api/rooms/:roomId/energy', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { period, date } = req.query;
    
    const energyData = await energyService.getEnergyUsageByRoom(roomId, period, date);
    res.json(energyData);
  } catch (error) {
    console.error('Error fetching energy data:', error);
    res.status(500).json({ error: 'Failed to fetch energy data' });
  }
});

app.get('/api/rooms/:roomId/energy/summary', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { period } = req.query;
    
    const summary = await energyService.getEnergySummary(roomId, period);
    res.json(summary);
  } catch (error) {
    console.error('Error fetching energy summary:', error);
    res.status(500).json({ error: 'Failed to fetch energy summary' });
  }
});

app.get('/api/rooms/:roomId/energy/comparison', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { period } = req.query;
    
    const comparison = await energyService.compareEnergyUsage(roomId, period);
    res.json(comparison);
  } catch (error) {
    console.error('Error comparing energy usage:', error);
    res.status(500).json({ error: 'Failed to compare energy usage' });
  }
});

app.get('/api/rooms/:roomId/energy/by-device-type', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { period } = req.query;
    
    const deviceTypeData = await energyService.getEnergyByDeviceType(roomId, period);
    res.json(deviceTypeData);
  } catch (error) {
    console.error('Error fetching energy by device type:', error);
    res.status(500).json({ error: 'Failed to fetch energy by device type' });
  }
});

// Testing/development routes - these would be removed in production
app.post('/api/test/rooms/:roomId/devices', async (req, res) => {
  try {
    const { roomId } = req.params;
    const deviceIds = await deviceService.createTestDevices(parseInt(roomId));
    res.json({ 
      message: `Created ${deviceIds.length} test devices for room ${roomId}`,
      deviceIds
    });
  } catch (error) {
    console.error('Error creating test devices:', error);
    res.status(500).json({ error: 'Failed to create test devices' });
  }
});

app.post('/api/test/rooms/:roomId/devices/:deviceId/energy', async (req, res) => {
  try {
    const { roomId, deviceId } = req.params;
    const count = req.body.count || 24;
    
    await energyService.generateTestData(parseInt(roomId), parseInt(deviceId), count);
    res.json({ 
      message: `Generated ${count} energy records for room ${roomId}, device ${deviceId}`
    });
  } catch (error) {
    console.error('Error generating test energy data:', error);
    res.status(500).json({ error: 'Failed to generate test energy data' });
  }
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'loginpage.html'));
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
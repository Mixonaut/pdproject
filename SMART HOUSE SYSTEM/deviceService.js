// deviceService.js - Device management functionality
const db = require('./db');

/**
 * Get all devices for a specific room
 * @param {number} roomId - The room ID
 * @returns {Promise<Array>} - Array of devices
 */
async function getDevicesByRoom(roomId) {
  try {
    const sql = `
      SELECT d.*, ds.status, ds.timestamp as last_updated
      FROM devices d
      LEFT JOIN (
        SELECT device_id, status, timestamp
        FROM device_status ds1
        WHERE (device_id, timestamp) IN (
          SELECT device_id, MAX(timestamp)
          FROM device_status
          GROUP BY device_id
        )
      ) ds ON d.device_id = ds.device_id
      WHERE d.room_id = ?
    `;
    
    return await db.query(sql, [roomId]);
  } catch (error) {
    console.error('Error getting devices by room:', error);
    throw error;
  }
}

/**
 * Add a new device to a room
 * @param {number} roomId - The room ID
 * @param {string} deviceType - Type of device (light, blind, thermostat, other)
 * @param {string} deviceName - Name of the device
 * @returns {Promise<number>} - The ID of the newly created device
 */
async function addDevice(roomId, deviceType, deviceName) {
  try {
    const sql = `
      INSERT INTO devices (room_id, device_type, device_name)
      VALUES (?, ?, ?)
    `;
    
    const result = await db.query(sql, [roomId, deviceType, deviceName]);
    
    // Initialize the device status to 'off'
    await updateDeviceStatus(result.insertId, 'off');
    
    return result.insertId;
  } catch (error) {
    console.error('Error adding device:', error);
    throw error;
  }
}

/**
 * Update a device's status
 * @param {number} deviceId - The device ID
 * @param {string} status - New status for the device
 * @returns {Promise<void>}
 */
async function updateDeviceStatus(deviceId, status) {
  try {
    const sql = `
      INSERT INTO device_status (device_id, status)
      VALUES (?, ?)
    `;
    
    await db.query(sql, [deviceId, status]);
  } catch (error) {
    console.error('Error updating device status:', error);
    throw error;
  }
}

/**
 * Remove a device
 * @param {number} deviceId - The device ID to remove
 * @returns {Promise<boolean>} - True if successful
 */
async function removeDevice(deviceId) {
  try {
    // First remove related records from device_status
    await db.query('DELETE FROM device_status WHERE device_id = ?', [deviceId]);
    
    // Then remove related records from energy_usage
    await db.query('DELETE FROM energy_usage WHERE device_id = ?', [deviceId]);
    
    // Finally remove the device itself
    const result = await db.query('DELETE FROM devices WHERE device_id = ?', [deviceId]);
    
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error removing device:', error);
    throw error;
  }
}

/**
 * Get status history for a device
 * @param {number} deviceId - The device ID
 * @param {number} limit - Maximum number of records to return
 * @returns {Promise<Array>} - Array of status history records
 */
async function getDeviceStatusHistory(deviceId, limit = 10) {
  try {
    const sql = `
      SELECT status, timestamp
      FROM device_status
      WHERE device_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    
    return await db.query(sql, [deviceId, limit]);
  } catch (error) {
    console.error('Error getting device status history:', error);
    throw error;
  }
}

/**
 * Create a set of test devices for a room
 * @param {number} roomId - The room ID
 * @returns {Promise<Array>} - Array of created device IDs
 */
async function createTestDevices(roomId) {
  try {
    const devices = [
      { type: 'light', name: 'Ceiling Light' },
      { type: 'light', name: 'Bedside Lamp' },
      { type: 'blind', name: 'Window Blind' },
      { type: 'thermostat', name: 'Room Thermostat' },
      { type: 'other', name: 'Smart TV' }
    ];
    
    const deviceIds = [];
    
    for (const device of devices) {
      const deviceId = await addDevice(roomId, device.type, device.name);
      deviceIds.push(deviceId);
      
      // Set random status (50% chance of being 'on')
      const status = Math.random() > 0.5 ? 'on' : 'off';
      await updateDeviceStatus(deviceId, status);
    }
    
    console.log(`Created ${deviceIds.length} test devices for room ${roomId}`);
    return deviceIds;
  } catch (error) {
    console.error('Error creating test devices:', error);
    throw error;
  }
}

module.exports = {
  getDevicesByRoom,
  addDevice,
  updateDeviceStatus,
  removeDevice,
  getDeviceStatusHistory,
  createTestDevices
};
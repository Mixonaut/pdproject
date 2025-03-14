// userRoomService.js - Service for managing user-room assignments using user_details table
const db = require('./db');

/**
 * Get the currently assigned room for a user
 * @param {number} userId - The user ID
 * @returns {Promise<Object|null>} - The room object or null if no assignment exists
 */
async function getUserRoom(userId) {
  try {
    const sql = `
      SELECT r.* 
      FROM rooms r
      JOIN user_details ud ON r.room_number = ud.room_number
      WHERE ud.user_id = ? AND ud.status = 'active'
      LIMIT 1
    `;
    
    const results = await db.query(sql, [userId]);
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error getting user room:', error);
    throw error;
  }
}

/**
 * Get all user-room assignments
 * @returns {Promise<Array>} - Array of user-room assignments
 */
async function getAllAssignments() {
  try {
    const sql = `
      SELECT ud.user_id, ud.first_name, ud.last_name, ud.room_number, ud.status,
             u.username, r.room_id, r.description
      FROM user_details ud
      JOIN users u ON ud.user_id = u.user_id
      LEFT JOIN rooms r ON ud.room_number = r.room_number
      WHERE ud.room_number IS NOT NULL
      ORDER BY ud.status = 'active' DESC, ud.room_number ASC
    `;
    
    return await db.query(sql);
  } catch (error) {
    console.error('Error getting all assignments:', error);
    throw error;
  }
}

/**
 * Get user-room assignments for a specific room
 * @param {number} roomId - The room ID
 * @returns {Promise<Array>} - Array of users assigned to the room
 */
async function getUsersByRoom(roomId) {
  try {
    // First get the room_number for this room_id
    const roomQuery = "SELECT room_number FROM rooms WHERE room_id = ?";
    const roomResult = await db.query(roomQuery, [roomId]);
    
    if (roomResult.length === 0) {
      return [];
    }
    
    const roomNumber = roomResult[0].room_number;
    
    const sql = `
      SELECT u.user_id, u.username, u.email, r.role_name, 
             ud.first_name, ud.last_name, ud.status
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      JOIN user_details ud ON u.user_id = ud.user_id
      WHERE ud.room_number = ? AND ud.status = 'active'
      ORDER BY u.username
    `;
    
    return await db.query(sql, [roomNumber]);
  } catch (error) {
    console.error('Error getting users by room:', error);
    throw error;
  }
}

/**
 * Get all rooms with their assigned users
 * @returns {Promise<Array>} - Array of rooms and their assigned users
 */
async function getRoomsWithUsers() {
  try {
    const sql = `
      SELECT r.room_id, r.room_number, r.description,
             GROUP_CONCAT(CONCAT(ud.first_name, ' ', ud.last_name) SEPARATOR ', ') as residents,
             COUNT(ud.user_id) as resident_count
      FROM rooms r
      LEFT JOIN user_details ud ON r.room_number = ud.room_number AND ud.status = 'active'
      GROUP BY r.room_id
      ORDER BY r.room_number
    `;
    
    return await db.query(sql);
  } catch (error) {
    console.error('Error getting rooms with users:', error);
    throw error;
  }
}

/**
 * Assign a room to a user
 * @param {number} userId - The user ID
 * @param {number} roomId - The room ID
 * @returns {Promise<boolean>} - True if successful
 */
async function assignRoom(userId, roomId) {
  try {
    // First get the room_number for this room_id
    const roomQuery = "SELECT room_number FROM rooms WHERE room_id = ?";
    const roomResult = await db.query(roomQuery, [roomId]);
    
    if (roomResult.length === 0) {
      throw new Error('Room not found');
    }
    
    const roomNumber = roomResult[0].room_number;
    
    // Check if user_details record exists for this user
    const checkQuery = "SELECT user_id FROM user_details WHERE user_id = ?";
    const checkResult = await db.query(checkQuery, [userId]);
    
    if (checkResult.length === 0) {
      // Create new user_details record
      const insertQuery = `
        INSERT INTO user_details (user_id, room_number, status)
        VALUES (?, ?, 'active')
      `;
      await db.query(insertQuery, [userId, roomNumber]);
    } else {
      // Update existing user_details record
      const updateQuery = `
        UPDATE user_details
        SET room_number = ?, status = 'active'
        WHERE user_id = ?
      `;
      await db.query(updateQuery, [roomNumber, userId]);
    }
    
    return true;
  } catch (error) {
    console.error('Error assigning room:', error);
    throw error;
  }
}

/**
 * Remove a user's room assignment
 * @param {number} userId - The user ID
 * @returns {Promise<boolean>} - True if successful
 */
async function removeAssignment(userId) {
  try {
    const sql = `
      UPDATE user_details
      SET room_number = NULL
      WHERE user_id = ? AND room_number IS NOT NULL
    `;
    
    const result = await db.query(sql, [userId]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error removing assignment:', error);
    throw error;
  }
}

/**
 * Check if a room has available capacity
 * @param {number} roomId - The room ID
 * @returns {Promise<boolean>} - True if room has availability
 */
async function checkRoomAvailability(roomId) {
  try {
    // First get the room_number for this room_id
    const roomQuery = "SELECT room_number, description FROM rooms WHERE room_id = ?";
    const roomResult = await db.query(roomQuery, [roomId]);
    
    if (roomResult.length === 0) {
      throw new Error('Room not found');
    }
    
    const roomNumber = roomResult[0].room_number;
    
    // Count current residents in this room
    const countQuery = `
      SELECT COUNT(*) as count 
      FROM user_details 
      WHERE room_number = ? AND status = 'active'
    `;
    
    const countResult = await db.query(countQuery, [roomNumber]);
    const currentCount = countResult[0].count;
    
    // Determine capacity based on description
    let capacity = 1; // Default to single room
    if (roomResult[0].description && roomResult[0].description.toLowerCase().includes('double')) {
      capacity = 2;
    }
    
    return currentCount < capacity;
  } catch (error) {
    console.error('Error checking room availability:', error);
    throw error;
  }
}

module.exports = {
  getUserRoom,
  getAllAssignments,
  getUsersByRoom,
  getRoomsWithUsers,
  assignRoom,
  removeAssignment,
  checkRoomAvailability
};
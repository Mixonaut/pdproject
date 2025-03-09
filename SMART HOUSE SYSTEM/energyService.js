// energyService.js - Energy monitoring functionality
const db = require('./db');

/**
 * Record energy usage for a device
 * @param {number} deviceId - The device ID
 * @param {number} roomId - The room ID
 * @param {number} energyConsumed - Amount of energy consumed in kWh
 * @returns {Promise<number>} - The ID of the new energy usage record
 */
async function recordEnergyUsage(deviceId, roomId, energyConsumed) {
  try {
    const sql = `
      INSERT INTO energy_usage (device_id, room_id, energy_consumed)
      VALUES (?, ?, ?)
    `;
    
    const result = await db.query(sql, [deviceId, roomId, energyConsumed]);
    return result.insertId;
  } catch (error) {
    console.error('Error recording energy usage:', error);
    throw error;
  }
}

/**
 * Get energy usage data for a specific room
 * @param {number} roomId - The room ID
 * @param {string} period - 'day', 'month', or 'year'
 * @param {string|null} specificDate - Optional specific date (YYYY-MM-DD)
 * @returns {Promise<Array>} - Array of energy usage records
 */
async function getEnergyUsageByRoom(roomId, period = 'day', specificDate = null) {
  try {
    let sql;
    let params = [roomId];
    let dateFilter = '';
    
    // Add date filter if provided
    if (specificDate) {
      dateFilter = ' AND DATE(timestamp) = ?';
      params.push(specificDate);
    }
    
    if (period === 'day') {
      sql = `
        SELECT 
          HOUR(timestamp) as hour,
          CAST(SUM(energy_consumed) AS DECIMAL(10,2)) as energy
        FROM energy_usage
        WHERE room_id = ?${dateFilter}
        GROUP BY HOUR(timestamp)
        ORDER BY hour
      `;
    } else if (period === 'month') {
      sql = `
        SELECT 
          DAY(timestamp) as day,
          CAST(SUM(energy_consumed) AS DECIMAL(10,2)) as energy
        FROM energy_usage
        WHERE room_id = ?${dateFilter}
        GROUP BY DAY(timestamp)
        ORDER BY day
      `;
    } else if (period === 'year') {
      sql = `
        SELECT 
          MONTH(timestamp) as month,
          CAST(SUM(energy_consumed) AS DECIMAL(10,2)) as energy
        FROM energy_usage
        WHERE room_id = ?${dateFilter}
        GROUP BY MONTH(timestamp)
        ORDER BY month
      `;
    }
    
    const results = await db.query(sql, params);
    
    // Convert NULL values to 0
    results.forEach(item => {
      if (item.energy === null) {
        item.energy = 0;
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error getting energy usage by room:', error);
    throw error;
  }
}

/**
 * Get energy usage data by device type
 * @param {number} roomId - The room ID
 * @param {string} period - 'day', 'month', or 'year'
 * @returns {Promise<Array>} - Array of energy usage by device type
 */
async function getEnergyByDeviceType(roomId, period = 'day') {
  try {
    let timeFilter;
    
    if (period === 'day') {
      timeFilter = 'AND DATE(e.timestamp) = CURDATE()';
    } else if (period === 'month') {
      timeFilter = 'AND MONTH(e.timestamp) = MONTH(CURDATE()) AND YEAR(e.timestamp) = YEAR(CURDATE())';
    } else if (period === 'year') {
      timeFilter = 'AND YEAR(e.timestamp) = YEAR(CURDATE())';
    }
    
    const sql = `
      SELECT 
        d.device_type,
        CAST(SUM(e.energy_consumed) AS DECIMAL(10,2)) as total_energy
      FROM energy_usage e
      JOIN devices d ON e.device_id = d.device_id
      WHERE e.room_id = ? ${timeFilter}
      GROUP BY d.device_type
    `;
    
    const results = await db.query(sql, [roomId]);
    
    // Convert NULL values to 0
    results.forEach(item => {
      if (item.total_energy === null) {
        item.total_energy = 0;
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error getting energy by device type:', error);
    throw error;
  }
}

/**
 * Get summary statistics for energy usage
 * @param {number} roomId - The room ID (optional, null for all rooms)
 * @param {string} period - 'day', 'month', or 'year'
 * @returns {Promise<Object>} - Summary statistics
 */
async function getEnergySummary(roomId = null, period = 'day') {
  try {
    let roomFilter = '';
    let params = [];
    
    if (roomId) {
      roomFilter = 'WHERE room_id = ?';
      params.push(roomId);
    }
    
    let timeFilter;
    if (period === 'day') {
      timeFilter = roomFilter ? 'AND DATE(timestamp) = CURDATE()' : 'WHERE DATE(timestamp) = CURDATE()';
    } else if (period === 'month') {
      const monthFilter = 'MONTH(timestamp) = MONTH(CURDATE()) AND YEAR(timestamp) = YEAR(CURDATE())';
      timeFilter = roomFilter ? `AND ${monthFilter}` : `WHERE ${monthFilter}`;
    } else if (period === 'year') {
      const yearFilter = 'YEAR(timestamp) = YEAR(CURDATE())';
      timeFilter = roomFilter ? `AND ${yearFilter}` : `WHERE ${yearFilter}`;
    }
    
    const sql = `
      SELECT 
        CAST(SUM(energy_consumed) AS DECIMAL(10,2)) as total_energy,
        CAST(AVG(energy_consumed) AS DECIMAL(10,2)) as average_energy,
        CAST(MAX(energy_consumed) AS DECIMAL(10,2)) as peak_energy
      FROM energy_usage
      ${roomFilter} ${timeFilter}
    `;
    
    const results = await db.query(sql, params);
    
    // Convert SQL NULL values to JS numbers
    const summary = results[0] || {};
    Object.keys(summary).forEach(key => {
      if (summary[key] === null) {
        summary[key] = 0;
      }
    });
    
    return summary;
  } catch (error) {
    console.error('Error getting energy summary:', error);
    throw error;
  }
}

/**
 * Compare energy usage between current and previous periods
 * @param {number} roomId - The room ID (optional, null for all rooms)
 * @param {string} currentPeriod - 'day', 'month', or 'year'
 * @returns {Promise<Object>} - Comparison results
 */
async function compareEnergyUsage(roomId = null, currentPeriod = 'day') {
  try {
    let roomFilter = '';
    let currentParams = [];
    let previousParams = [];
    
    if (roomId) {
      roomFilter = 'WHERE room_id = ?';
      currentParams.push(roomId);
      previousParams.push(roomId);
    }
    
    let currentTimeFilter, previousTimeFilter;
    
    if (currentPeriod === 'day') {
      // Today vs yesterday
      currentTimeFilter = roomFilter ? 'AND DATE(timestamp) = CURDATE()' : 'WHERE DATE(timestamp) = CURDATE()';
      previousTimeFilter = roomFilter ? 'AND DATE(timestamp) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)' : 'WHERE DATE(timestamp) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)';
    } else if (currentPeriod === 'month') {
      // This month vs last month
      const currentMonthFilter = 'MONTH(timestamp) = MONTH(CURDATE()) AND YEAR(timestamp) = YEAR(CURDATE())';
      const previousMonthFilter = 'MONTH(timestamp) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND YEAR(timestamp) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))';
      
      currentTimeFilter = roomFilter ? `AND ${currentMonthFilter}` : `WHERE ${currentMonthFilter}`;
      previousTimeFilter = roomFilter ? `AND ${previousMonthFilter}` : `WHERE ${previousMonthFilter}`;
    } else if (currentPeriod === 'year') {
      // This year vs last year
      const currentYearFilter = 'YEAR(timestamp) = YEAR(CURDATE())';
      const previousYearFilter = 'YEAR(timestamp) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 YEAR))';
      
      currentTimeFilter = roomFilter ? `AND ${currentYearFilter}` : `WHERE ${currentYearFilter}`;
      previousTimeFilter = roomFilter ? `AND ${previousYearFilter}` : `WHERE ${previousYearFilter}`;
    }
    
    const currentSql = `
      SELECT CAST(SUM(energy_consumed) AS DECIMAL(10,2)) as total_energy
      FROM energy_usage
      ${roomFilter} ${currentTimeFilter}
    `;
    
    const previousSql = `
      SELECT CAST(SUM(energy_consumed) AS DECIMAL(10,2)) as total_energy
      FROM energy_usage
      ${roomFilter} ${previousTimeFilter}
    `;
    
    const currentResults = await db.query(currentSql, currentParams);
    const previousResults = await db.query(previousSql, previousParams);
    
    // Handle NULL values
    const currentEnergy = currentResults[0]?.total_energy || 0;
    const previousEnergy = previousResults[0]?.total_energy || 0;
    
    // Calculate percentage change
    let percentageChange = 0;
    if (previousEnergy > 0) {
      percentageChange = ((currentEnergy - previousEnergy) / previousEnergy) * 100;
    }
    
    return {
      currentEnergy,
      previousEnergy,
      difference: currentEnergy - previousEnergy,
      percentageChange
    };
  } catch (error) {
    console.error('Error comparing energy usage:', error);
    throw error;
  }
}

/**
 * Generate random energy data for testing
 * @param {number} roomId - The room ID
 * @param {number} deviceId - The device ID
 * @param {number} count - Number of records to generate
 * @returns {Promise<void>}
 */
async function generateTestData(roomId, deviceId, count = 24) {
  try {
    for (let i = 0; i < count; i++) {
      // Generate random energy usage between 0.1 and 5.0 kWh
      const energyConsumed = +(Math.random() * 4.9 + 0.1).toFixed(2);
      
      // Generate timestamps for the past 'count' hours
      const timestamp = new Date();
      timestamp.setHours(timestamp.getHours() - (count - i));
      
      const sql = `
        INSERT INTO energy_usage (device_id, room_id, energy_consumed, timestamp) 
        VALUES (?, ?, ?, ?)
      `;
      
      await db.query(sql, [deviceId, roomId, energyConsumed, timestamp]);
    }
    
    console.log(`Generated ${count} test energy records for room ${roomId}, device ${deviceId}`);
  } catch (error) {
    console.error('Error generating test data:', error);
    throw error;
  }
}

module.exports = {
  recordEnergyUsage,
  getEnergyUsageByRoom,
  getEnergyByDeviceType,
  getEnergySummary,
  compareEnergyUsage,
  generateTestData
};
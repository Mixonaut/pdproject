// apiClient.js - Frontend API client for smart home system
// Place this file in the public/js directory

/**
 * Smart Home API Client
 * Handles all API requests to the server
 */
const smartHomeApi = {
  /**
   * Room related API methods
   */
  rooms: {
    /**
     * Get all rooms
     * @returns {Promise<Array>} Array of rooms
     */
    getAll: async function () {
      try {
        const response = await fetch("/api/rooms");
        if (!response.ok) throw new Error("Failed to fetch rooms");
        return await response.json();
      } catch (error) {
        console.error("Error fetching rooms:", error);
        return [];
      }
    },

    /**
     * Create a new room
     * @param {string} roomNumber - Room number
     * @param {string} description - Room description
     * @returns {Promise<Object>} Created room info
     */
    create: async function (roomNumber, description) {
      try {
        const response = await fetch("/api/rooms", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomNumber, description }),
        });

        if (!response.ok) throw new Error("Failed to create room");
        return await response.json();
      } catch (error) {
        console.error("Error creating room:", error);
        throw error;
      }
    },
  },

  /**
   * Device related API methods
   */
  devices: {
    /**
     * Get devices for a room
     * @param {number} roomId - Room ID
     * @returns {Promise<Array>} Array of devices
     */
    getByRoom: async function (roomId) {
      try {
        const response = await fetch(`/api/rooms/${roomId}/devices`);
        if (!response.ok) throw new Error("Failed to fetch devices");
        return await response.json();
      } catch (error) {
        console.error(`Error fetching devices for room ${roomId}:`, error);
        return [];
      }
    },

    /**
     * Add a new device to a room
     * @param {number} roomId - Room ID
     * @param {string} deviceType - Device type (light, blind, thermostat, other)
     * @param {string} deviceName - Device name
     * @returns {Promise<Object>} Created device info
     */
    add: async function (roomId, deviceType, deviceName) {
      try {
        const response = await fetch(`/api/rooms/${roomId}/devices`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ deviceType, deviceName }),
        });

        if (!response.ok) throw new Error("Failed to add device");
        return await response.json();
      } catch (error) {
        console.error("Error adding device:", error);
        throw error;
      }
    },

    /**
     * Update device status
     * @param {number} deviceId - Device ID
     * @param {string} status - New status (e.g., 'on', 'off')
     * @returns {Promise<Object>} Response message
     */
    updateStatus: async function (deviceId, status) {
      try {
        const response = await fetch(`/api/devices/${deviceId}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        if (!response.ok) throw new Error("Failed to update device status");
        return await response.json();
      } catch (error) {
        console.error(`Error updating status for device ${deviceId}:`, error);
        throw error;
      }
    },

    /**
     * Remove a device
     * @param {number} deviceId - Device ID
     * @returns {Promise<Object>} Response message
     */
    remove: async function (deviceId) {
      try {
        const response = await fetch(`/api/devices/${deviceId}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Failed to remove device");
        return await response.json();
      } catch (error) {
        console.error(`Error removing device ${deviceId}:`, error);
        throw error;
      }
    },

    /**
     * Get device status history
     * @param {number} deviceId - Device ID
     * @param {number} limit - Maximum number of records to retrieve
     * @returns {Promise<Array>} Status history
     */
    getHistory: async function (deviceId, limit = 10) {
      try {
        const response = await fetch(
          `/api/devices/${deviceId}/history?limit=${limit}`
        );
        if (!response.ok) throw new Error("Failed to fetch device history");
        return await response.json();
      } catch (error) {
        console.error(`Error fetching history for device ${deviceId}:`, error);
        return [];
      }
    },
  },

  /**
   * Energy monitoring API methods
   */
  energy: {
    /**
     * Get energy usage data for a room
     * @param {number} roomId - Room ID
     * @param {string} period - Time period ('day', 'month', 'year')
     * @param {string} date - Optional specific date (YYYY-MM-DD)
     * @returns {Promise<Array>} Energy usage data
     */
    getUsage: async function (roomId, period = "day", date = null) {
      try {
        let url = `/api/rooms/${roomId}/energy?period=${period}`;
        if (date) url += `&date=${date}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch energy usage");
        return await response.json();
      } catch (error) {
        console.error(`Error fetching energy data for room ${roomId}:`, error);
        return [];
      }
    },

    /**
     * Get energy usage summary
     * @param {number} roomId - Room ID
     * @param {string} period - Time period ('day', 'month', 'year')
     * @returns {Promise<Object>} Energy summary
     */
    getSummary: async function (roomId, period = "day") {
      try {
        const response = await fetch(
          `/api/rooms/${roomId}/energy/summary?period=${period}`
        );
        if (!response.ok) throw new Error("Failed to fetch energy summary");
        return await response.json();
      } catch (error) {
        console.error(
          `Error fetching energy summary for room ${roomId}:`,
          error
        );
        return null;
      }
    },

    /**
     * Compare energy usage with previous period
     * @param {number} roomId - Room ID
     * @param {string} period - Time period ('day', 'month', 'year')
     * @returns {Promise<Object>} Comparison data
     */
    getComparison: async function (roomId, period = "day") {
      try {
        const response = await fetch(
          `/api/rooms/${roomId}/energy/comparison?period=${period}`
        );
        if (!response.ok) throw new Error("Failed to fetch energy comparison");
        return await response.json();
      } catch (error) {
        console.error(
          `Error fetching energy comparison for room ${roomId}:`,
          error
        );
        return null;
      }
    },

    /**
     * Get energy usage by device type
     * @param {number} roomId - Room ID
     * @param {string} period - Time period ('day', 'month', 'year')
     * @returns {Promise<Array>} Energy usage by device type
     */
    getByDeviceType: async function (roomId, period = "day") {
      try {
        const response = await fetch(
          `/api/rooms/${roomId}/energy/by-device-type?period=${period}`
        );
        if (!response.ok)
          throw new Error("Failed to fetch energy by device type");
        return await response.json();
      } catch (error) {
        console.error(
          `Error fetching energy by device type for room ${roomId}:`,
          error
        );
        return [];
      }
    },
  },

  /**
   * Testing methods - only for development
   */
  test: {
    /**
     * Create test devices for a room
     * @param {number} roomId - Room ID
     * @returns {Promise<Object>} Result message
     */
    createDevices: async function (roomId) {
      try {
        const response = await fetch(`/api/test/rooms/${roomId}/devices`, {
          method: "POST",
        });

        if (!response.ok) throw new Error("Failed to create test devices");
        return await response.json();
      } catch (error) {
        console.error(`Error creating test devices for room ${roomId}:`, error);
        throw error;
      }
    },

    /**
     * Generate test energy data for a device
     * @param {number} roomId - Room ID
     * @param {number} deviceId - Device ID
     * @param {number} count - Number of records to generate
     * @returns {Promise<Object>} Result message
     */
    generateEnergyData: async function (roomId, deviceId, count = 24) {
      try {
        const response = await fetch(
          `/api/test/rooms/${roomId}/devices/${deviceId}/energy`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ count }),
          }
        );

        if (!response.ok)
          throw new Error("Failed to generate test energy data");
        return await response.json();
      } catch (error) {
        console.error(
          `Error generating test energy data for device ${deviceId}:`,
          error
        );
        throw error;
      }
    },
  },
};

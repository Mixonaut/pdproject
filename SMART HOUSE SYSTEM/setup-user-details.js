// setup-user-details.js - Ensure user_details entries exist for all users
const db = require('./db');

async function setupUserDetails() {
  try {
    console.log('Testing database connection...');
    const connected = await db.testConnection();
    
    if (!connected) {
      console.error('❌ Database connection failed!');
      process.exit(1);
    }
    
    console.log('✅ Connected to database successfully.');
    
    // Get all users
    console.log('Fetching all users...');
    const users = await db.query('SELECT user_id, username FROM users');
    console.log(`Found ${users.length} users in the system.`);
    
    // Get existing user_details records
    const existingDetails = await db.query('SELECT user_id FROM user_details');
    const existingUserIds = existingDetails.map(record => record.user_id);
    console.log(`Found ${existingDetails.length} existing user_details records.`);
    
    // Find users missing user_details records
    const usersToAdd = users.filter(user => !existingUserIds.includes(user.user_id));
    console.log(`${usersToAdd.length} users need user_details records created.`);
    
    // Create user_details records for users that don't have them
    if (usersToAdd.length > 0) {
      console.log('Creating missing user_details records...');
      
      for (const user of usersToAdd) {
        const names = user.username.split(' ');
        const firstName = names[0] || '';
        const lastName = names.length > 1 ? names[names.length - 1] : '';
        
        console.log(`Creating user_details for ${user.username} (ID: ${user.user_id})`);
        
        await db.query(`
          INSERT INTO user_details (user_id, first_name, last_name, status)
          VALUES (?, ?, ?, 'active')
        `, [user.user_id, firstName, lastName]);
      }
      
      console.log('✅ Created missing user_details records successfully.');
    }
    
    // Find resident users without room assignments
    console.log('Checking for residents without room assignments...');
    
    const residentsQuery = `
      SELECT u.user_id, u.username, ud.room_number 
      FROM users u
      JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN user_details ud ON u.user_id = ud.user_id
      WHERE r.role_name = 'resident' AND (ud.room_number IS NULL OR ud.room_number = '')
    `;
    
    const unassignedResidents = await db.query(residentsQuery);
    console.log(`Found ${unassignedResidents.length} residents without room assignments.`);
    
    // If there are unassigned residents and available rooms, assign them
    if (unassignedResidents.length > 0) {
      // Get available rooms (rooms without active residents)
      const availableRoomsQuery = `
        SELECT r.* 
        FROM rooms r
        LEFT JOIN (
          SELECT room_number, COUNT(*) as resident_count
          FROM user_details
          WHERE status = 'active' AND room_number IS NOT NULL
          GROUP BY room_number
        ) ud ON r.room_number = ud.room_number
        WHERE ud.resident_count IS NULL OR ud.resident_count = 0
        ORDER BY r.room_number
      `;
      
      const availableRooms = await db.query(availableRoomsQuery);
      console.log(`Found ${availableRooms.length} available rooms.`);
      
      // Assign residents to rooms
      const limit = Math.min(unassignedResidents.length, availableRooms.length);
      
      if (limit > 0) {
        console.log(`Assigning ${limit} residents to rooms...`);
        
        for (let i = 0; i < limit; i++) {
          const resident = unassignedResidents[i];
          const room = availableRooms[i];
          
          console.log(`Assigning ${resident.username} to Room ${room.room_number}...`);
          
          await db.query(`
            UPDATE user_details
            SET room_number = ?
            WHERE user_id = ?
          `, [room.room_number, resident.user_id]);
        }
        
        console.log('✅ Room assignments created successfully!');
      } else {
        console.log('⚠️ Not enough available rooms to assign residents.');
      }
    }
    
    console.log('✅ User details setup completed successfully!');
  } catch (error) {
    console.error('❌ Error setting up user details:', error);
  } finally {
    process.exit();
  }
}

// Run the setup function
setupUserDetails();
#!/usr/bin/env python3
"""
Smart Home Sensor Simulator
---------------------------
This script simulates sensors for a smart home system by:
1. Connecting to the MySQL database
2. Creating rooms and devices if they don't exist
3. Generating random device status changes (on/off)
4. Creating energy usage data with realistic patterns
5. Simulating temperature variations
"""

import mysql.connector
import time
import random
import datetime
import argparse
from typing import List, Dict, Any, Tuple, Optional

# Database connection parameters
DB_CONFIG = {
    "host": "132.145.18.222",
    "user": "nm2064",
    "password": "wnd2VKSANY7",
    "database": "nm2064"
}

# Device types and their average energy consumption (kWh per hour)
DEVICE_TYPES = {
    "light": {"min_energy": 0.02, "max_energy": 0.06, "status_change_prob": 0.3},
    "thermostat": {"min_energy": 0.5, "max_energy": 1.5, "status_change_prob": 0.1},
    "blind": {"min_energy": 0.01, "max_energy": 0.03, "status_change_prob": 0.2},
    "tv": {"min_energy": 0.1, "max_energy": 0.3, "status_change_prob": 0.25},
    "other": {"min_energy": 0.05, "max_energy": 0.2, "status_change_prob": 0.15}
}

class DatabaseManager:
    """Handles database operations"""
    
    def __init__(self):
        """Initialize database connection"""
        try:
            self.conn = mysql.connector.connect(**DB_CONFIG)
            self.cursor = self.conn.cursor(dictionary=True)
            print("✅ Successfully connected to database")
        except mysql.connector.Error as err:
            print(f"❌ Database connection error: {err}")
            raise

    def close(self):
        """Close database connection"""
        if hasattr(self, 'cursor') and self.cursor:
            self.cursor.close()
        if hasattr(self, 'conn') and self.conn:
            self.conn.close()
            print("✅ Database connection closed")

    def execute_query(self, query: str, params: tuple = None) -> List[Dict[str, Any]]:
        """Execute a database query"""
        try:
            self.cursor.execute(query, params or ())
            if query.strip().upper().startswith(('SELECT', 'SHOW')):
                return self.cursor.fetchall()
            else:
                self.conn.commit()
                if self.cursor.lastrowid:
                    return [{"insert_id": self.cursor.lastrowid}]
                return [{"affected_rows": self.cursor.rowcount}]
        except mysql.connector.Error as err:
            print(f"❌ Query error: {err}")
            print(f"Query: {query}")
            print(f"Params: {params}")
            self.conn.rollback()
            return []

    def get_rooms(self) -> List[Dict[str, Any]]:
        """Get all rooms from the database"""
        query = "SELECT * FROM rooms"
        return self.execute_query(query)

    def create_room(self, room_number: str, description: str) -> int:
        """Create a new room"""
        query = "INSERT INTO rooms (room_number, description) VALUES (%s, %s)"
        result = self.execute_query(query, (room_number, description))
        return result[0].get("insert_id", 0) if result else 0

    def get_devices_by_room(self, room_id: int) -> List[Dict[str, Any]]:
        """Get all devices for a specific room"""
        query = "SELECT * FROM devices WHERE room_id = %s"
        return self.execute_query(query, (room_id,))

    def create_device(self, room_id: int, device_type: str, device_name: str) -> int:
        """Create a new device"""
        query = "INSERT INTO devices (room_id, device_type, device_name) VALUES (%s, %s, %s)"
        result = self.execute_query(query, (room_id, device_type, device_name))
        return result[0].get("insert_id", 0) if result else 0

    def update_device_status(self, device_id: int, status: str) -> bool:
        """Update a device's status"""
        query = "INSERT INTO device_status (device_id, status) VALUES (%s, %s)"
        result = self.execute_query(query, (device_id, status))
        return bool(result and result[0].get("insert_id", 0))

    def get_current_device_status(self, device_id: int) -> Optional[str]:
        """Get current status of a device"""
        query = """
            SELECT status FROM device_status 
            WHERE device_id = %s 
            ORDER BY timestamp DESC 
            LIMIT 1
        """
        result = self.execute_query(query, (device_id,))
        return result[0]["status"] if result else None

    def record_energy_usage(self, device_id: int, room_id: int, energy_consumed: float, timestamp: datetime.datetime = None) -> int:
        """Record energy usage for a device"""
        if timestamp:
            query = "INSERT INTO energy_usage (device_id, room_id, energy_consumed, timestamp) VALUES (%s, %s, %s, %s)"
            result = self.execute_query(query, (device_id, room_id, energy_consumed, timestamp))
        else:
            query = "INSERT INTO energy_usage (device_id, room_id, energy_consumed) VALUES (%s, %s, %s)"
            result = self.execute_query(query, (device_id, room_id, energy_consumed))
        
        return result[0].get("insert_id", 0) if result else 0


class SensorSimulator:
    """Simulates various sensors and devices in a smart home"""
    
    def __init__(self, db_manager: DatabaseManager, simulation_speed: float = 1.0):
        """Initialize the simulator"""
        self.db = db_manager
        self.simulation_speed = simulation_speed  # Multiplier for time (higher = faster simulation)
        self.rooms = []
        self.devices = {}  # room_id -> list of devices
        self.load_or_create_rooms()
        self.load_or_create_devices()
        print(f"🏠 Initialized simulator with {len(self.rooms)} rooms and {sum(len(devices) for devices in self.devices.values())} devices")

    def load_or_create_rooms(self, num_rooms: int = 5):
        """Load existing rooms or create new ones"""
        self.rooms = self.db.get_rooms()
        
        if not self.rooms:
            print("🏗️ No rooms found, creating test rooms...")
            for i in range(1, num_rooms + 1):
                floor = (i - 1) // 2 + 1
                room_number = f"{floor}0{i % 2 + 1}"
                description = f"{'Single' if i % 3 != 0 else 'Double'} room on floor {floor}"
                room_id = self.db.create_room(room_number, description)
                if room_id:
                    self.rooms.append({"room_id": room_id, "room_number": room_number, "description": description})
                    print(f"  ✅ Created room {room_number} (ID: {room_id})")
        else:
            print(f"📋 Found {len(self.rooms)} existing rooms")

    def load_or_create_devices(self):
        """Load existing devices for each room or create new ones"""
        for room in self.rooms:
            room_id = room["room_id"]
            devices = self.db.get_devices_by_room(room_id)
            
            if not devices:
                print(f"🔌 No devices found for room {room['room_number']}, creating test devices...")
                devices = []
                
                # Create a common set of devices for each room
                new_devices = [
                    ("light", "Ceiling Light"),
                    ("light", "Bedside Lamp"),
                    ("blind", "Window Blind"),
                    ("thermostat", "Room Thermostat")
                ]
                
                # Add some random devices
                if room_id % 3 == 0:
                    new_devices.append(("tv", "Smart TV"))
                if room_id % 2 == 0:
                    new_devices.append(("other", "Air Purifier"))
                
                for device_type, device_name in new_devices:
                    device_id = self.db.create_device(room_id, device_type, device_name)
                    if device_id:
                        # Set initial status randomly
                        initial_status = "on" if random.random() > 0.5 else "off"
                        self.db.update_device_status(device_id, initial_status)
                        
                        devices.append({
                            "device_id": device_id,
                            "room_id": room_id,
                            "device_type": device_type,
                            "device_name": device_name,
                            "status": initial_status
                        })
                        print(f"  ✅ Created {device_name} (ID: {device_id}) in room {room['room_number']}")
            else:
                print(f"📋 Found {len(devices)} existing devices for room {room['room_number']}")
                
                # Update device statuses if missing
                for device in devices:
                    status = self.db.get_current_device_status(device["device_id"])
                    if not status:
                        status = "on" if random.random() > 0.5 else "off"
                        self.db.update_device_status(device["device_id"], status)
                    device["status"] = status
            
            self.devices[room_id] = devices

    def simulate_device_status_changes(self):
        """Simulate random device status changes"""
        changes_made = 0
        
        for room_id, devices in self.devices.items():
            for device in devices:
                device_type = device["device_type"]
                if device_type in DEVICE_TYPES:
                    # Check if status should change based on probability
                    if random.random() < DEVICE_TYPES[device_type]["status_change_prob"]:
                        # Toggle the status
                        new_status = "off" if device["status"] == "on" else "on"
                        if self.db.update_device_status(device["device_id"], new_status):
                            device["status"] = new_status
                            changes_made += 1
                            print(f"🔄 Changed {device['device_name']} in room {room_id} to '{new_status}'")
        
        return changes_made

    def simulate_energy_usage(self, hours_ago: int = 0):
        """Simulate energy usage for all devices"""
        records_created = 0
        
        # Use current time or a time in the past if hours_ago is specified
        if hours_ago:
            timestamp = datetime.datetime.now() - datetime.timedelta(hours=hours_ago)
        else:
            timestamp = None
        
        for room_id, devices in self.devices.items():
            for device in devices:
                if device["status"] == "on":  # Only active devices consume energy
                    device_type = device["device_type"]
                    if device_type in DEVICE_TYPES:
                        # Generate random energy consumption within the device's range
                        min_energy = DEVICE_TYPES[device_type]["min_energy"]
                        max_energy = DEVICE_TYPES[device_type]["max_energy"]
                        
                        # Apply time-of-day variations (more usage during day/evening)
                        current_hour = datetime.datetime.now().hour if not hours_ago else timestamp.hour
                        time_factor = 1.0
                        
                        if 7 <= current_hour < 10:  # Morning peak
                            time_factor = 1.2
                        elif 10 <= current_hour < 16:  # Daytime
                            time_factor = 0.8
                        elif 16 <= current_hour < 22:  # Evening peak
                            time_factor = 1.5
                        else:  # Night
                            time_factor = 0.4
                            
                        # Apply some randomness to the energy usage
                        energy = random.uniform(min_energy, max_energy) * time_factor
                        
                        # Record the energy usage
                        if self.db.record_energy_usage(device["device_id"], room_id, energy, timestamp):
                            records_created += 1
                            if hours_ago:
                                timestamp_str = timestamp.strftime("%Y-%m-%d %H:%M:%S")
                                print(f"⚡ Recorded {energy:.4f} kWh for {device['device_name']} at {timestamp_str}")
                            else:
                                print(f"⚡ Recorded {energy:.4f} kWh for {device['device_name']}")
        
        return records_created

    def generate_historical_data(self, days: int = 7):
        """Generate historical data for the past X days"""
        print(f"📅 Generating historical data for the past {days} days...")
        
        total_records = 0
        hours_to_generate = days * 24
        
        for hour in range(hours_to_generate, 0, -1):
            # Every 6 hours, simulate some device status changes
            if hour % 6 == 0:
                self.simulate_device_status_changes()
            
            # Simulate energy usage for this hour
            records = self.simulate_energy_usage(hours_ago=hour)
            total_records += records
            
            # Print progress
            if hour % 24 == 0:
                print(f"📊 Generated data for {(hours_to_generate - hour) // 24 + 1} days ago ({total_records} records so far)")
        
        print(f"✅ Historical data generation complete! Created {total_records} energy usage records.")
        return total_records

    def run_simulation_loop(self, interval_seconds: int = 60, duration_minutes: int = 60):
        """Run a continuous simulation loop"""
        print(f"🔄 Starting simulation loop (interval: {interval_seconds}s, duration: {duration_minutes}m)")
        
        # Calculate number of iterations
        iterations = int((duration_minutes * 60) / interval_seconds)
        adjusted_interval = interval_seconds / self.simulation_speed
        
        for i in range(iterations):
            start_time = time.time()
            
            # Simulate device status changes (10% chance per iteration)
            if random.random() < 0.1:
                changes = self.simulate_device_status_changes()
                print(f"👆 Iteration {i+1}/{iterations}: Changed {changes} device statuses")
            
            # Simulate energy usage every iteration
            records = self.simulate_energy_usage()
            print(f"📊 Iteration {i+1}/{iterations}: Created {records} energy records")
            
            # Calculate sleep time to maintain the interval
            elapsed = time.time() - start_time
            sleep_time = max(0, adjusted_interval - elapsed)
            
            if i < iterations - 1:  # Don't sleep after the last iteration
                print(f"💤 Sleeping for {sleep_time:.2f}s (adjusted for simulation speed)")
                time.sleep(sleep_time)
        
        print("✅ Simulation loop complete!")


def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Smart Home Sensor Simulator")
    
    parser.add_argument("--historical", type=int, default=0, 
                        help="Generate historical data for the specified number of days")
    
    parser.add_argument("--duration", type=int, default=60,
                        help="Duration to run the live simulation in minutes")
    
    parser.add_argument("--interval", type=int, default=60,
                        help="Interval between simulation updates in seconds")
    
    parser.add_argument("--speed", type=float, default=1.0,
                        help="Simulation speed multiplier (higher = faster)")
    
    return parser.parse_args()


def main():
    """Main entry point"""
    args = parse_arguments()
    
    print("🏠 Smart Home Sensor Simulator")
    print("------------------------------")
    
    # Connect to the database
    db_manager = DatabaseManager()
    
    try:
        # Initialize the simulator
        simulator = SensorSimulator(db_manager, simulation_speed=args.speed)
        
        # Generate historical data if requested
        if args.historical > 0:
            simulator.generate_historical_data(days=args.historical)
        
        # Run the simulation loop
        simulator.run_simulation_loop(
            interval_seconds=args.interval,
            duration_minutes=args.duration
        )
    
    except KeyboardInterrupt:
        print("\n🛑 Simulation interrupted by user")
    except Exception as e:
        print(f"❌ Error during simulation: {e}")
    finally:
        # Clean up
        db_manager.close()
        print("👋 Simulation complete!")


if __name__ == "__main__":
    main()

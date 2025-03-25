# SmartCare+ Smart Home Control System

A modern web application for managing and controlling smart home devices, built with Node.js, Express, and MySQL.

## Main Features

- User authentication and authorisation (Admin and Resident roles)
- Room management
- Device control and monitoring
- Energy consumption tracking
- Real-time device status updates

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- MySQL Server
- npm (Node Package Manager)

## Installation

1. Clone the repository:

git clone https://github.com/Mixonaut/pdproject.git
cd pdproject

2. Install dependencies:

npm install

## Running the Application

1. Start theserver:

npm start

2. The application will be available at `http://localhost:3000`

### Poplating Rooms with Data

1. You can populate the rooms with mock data by running:
   python sensor_simulator.py --duration 60 --interval 30

This will run a simulator to fill energy usage stats

## Project Structure

```
pdproject/
├── SMART HOUSE SYSTEM/
│   ├── server.js          # Main application server
│   ├── db.js             # Database configuration
│   ├── auth.js           # Authentication handlers
│   ├── energyService.js  # Energy management service
│   ├── deviceService.js  # Device management service
│   ├── userRoomService.js # User-Room relationship service
│   └── public/           # Static files (HTML, CSS, JS)
├── package.json
└── package-lock.json
```

## API Endpoints

### Authentication

- `POST /users/login` - User login
- `POST /users` - User registration
- `GET /users` - Get all users (admin only)
- `PUT /users/:userId` - Update user (admin only)
- `DELETE /users/:userId` - Delete user (admin only)

### Rooms

- `GET /api/rooms` - Get all rooms
- `POST /api/rooms` - Create a new room

### Devices

- `GET /api/rooms/:roomId/devices` - Get devices in a room
- `POST /api/rooms/:roomId/devices` - Add a device to a room
- `PUT /api/devices/:deviceId/status` - Update device status

## Security Features

- Password hashing using bcrypt
- Session-based authentication
- Role-based access control

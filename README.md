# SmartMove – Dynamic Bus Journey Planner Prototype

A two-member hackathon prototype for exploring a public-transport journey planner.

## Features
- Responsive overview dashboard
- Live *simulated* bus positions updated through Socket.IO every 3 seconds
- Interactive map using Leaflet and OpenStreetMap
- Journey search using sample stop/route data
- Estimated travel time adjusted using demo traffic/speed data
- Alternative sample journey options when no direct route exists
- Traffic corridor analytics
- Express REST API
- MySQL schema included for future persistence

## Requirements
- Node.js 18+ and npm
- Internet connection for map tiles and Leaflet CDN
- MySQL Workbench is optional for this demo

## Run locally
1. Extract the ZIP.
2. Open the `SmartMove` folder in VS Code.
3. Open terminal in that folder.
4. Run:
   ```bash
   npm install
   npm start
   ```
5. Open `http://localhost:3000`.

## API endpoints
- `GET /api/health`
- `GET /api/dashboard`
- `GET /api/buses`
- `GET /api/routes`
- `GET /api/stops`
- `GET /api/traffic`
- `POST /api/journey/search` with JSON body `{ "from": "S1", "to": "S5" }`

## MySQL
The `database/schema.sql` file creates the initial database tables. The current demo runs with in-memory sample data so it starts without database credentials. It is not yet wired to persist records in MySQL.

## Important prototype limitations
- Bus positions, traffic scores, occupancy and arrival estimates are illustrative simulated data.
- Map routes are simplified straight-line connections between sample stops, not verified road-following bus paths.
- No official Delhi bus GPS feed is connected.
- ETA is a simple demo estimate, not a trained predictive model.
- Before public use, replace sample data with an authorized real-time feed, validate route geometry, build a robust routing engine, and connect the backend to MySQL.

## Suggested team split
- Backend: API, journey search logic, Socket.IO simulation, later MySQL integration.
- Frontend: dashboard, responsive styling, Leaflet map, journey planner and API integration.

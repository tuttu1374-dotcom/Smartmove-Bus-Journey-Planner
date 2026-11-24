CREATE DATABASE IF NOT EXISTS smartmove;
USE smartmove;

CREATE TABLE routes (
  id VARCHAR(20) PRIMARY KEY,
  route_number VARCHAR(30) NOT NULL,
  route_name VARCHAR(100) NOT NULL,
  base_minutes INT NOT NULL
);

CREATE TABLE bus_stops (
  id VARCHAR(20) PRIMARY KEY,
  stop_name VARCHAR(100) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL
);

CREATE TABLE buses (
  id VARCHAR(20) PRIMARY KEY,
  route_id VARCHAR(20) NOT NULL,
  bus_status VARCHAR(40) DEFAULT 'On time',
  FOREIGN KEY (route_id) REFERENCES routes(id)
);

CREATE TABLE bus_locations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  bus_id VARCHAR(20) NOT NULL,
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  speed_kmh DECIMAL(5,2),
  occupancy_percent INT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bus_id) REFERENCES buses(id)
);

CREATE TABLE traffic_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  corridor_name VARCHAR(100) NOT NULL,
  congestion_score INT NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE journeys (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  origin_stop_id VARCHAR(20) NOT NULL,
  destination_stop_id VARCHAR(20) NOT NULL,
  estimated_minutes INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

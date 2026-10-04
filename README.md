# tda-visualization
A fullstack web platform for applying Topological Data Analysis (TDA) to vehicle sensor data, built as a diploma thesis at the University of Patras.

## Features
- **TDA microservice (Python, FastAPI):** computes persistent homology (Vietoris–Rips) with Ripser and GUDHI, including a sliding-window mode over speed and acceleration signals
- **Live sensor stream:** simulated vehicle data (10 Hz) streamed over Socket.IO/WebSockets, with rule-based anomaly scoring and real-time alerts
- **React dashboard:** live charts, persistence diagrams and barcodes, CSV dataset upload
- **Backend (Node.js, Express):** JWT authentication, role-based access, rate limiting
- **Storage:** PostgreSQL for computation results and sensor data, MongoDB for users and datasets
- **Deployment:** Docker Compose with nginx

## Architecture
React (Vite) → Node.js/Express API + Socket.IO → Python FastAPI TDA service → PostgreSQL / MongoDB

## Note
Sensor data in the live stream is simulated. Anomaly alerts in the dashboard use threshold-based scoring; the TDA service is exposed separately for persistence computations.

## Running locally
1. Copy `.env.example` files in `backend/` and `frontend/` to `.env` and fill in your own values
2. Run `docker compose up --build`
3. Open the frontend at the port defined in your configuration

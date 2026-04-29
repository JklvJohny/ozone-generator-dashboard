# Ozone Generator Dashboard - FastAPI Backend

This is the backend for the university IoT Ozone monitoring and control system. It provides a REST API, WebSockets for realtime updates, and an MQTT client to communicate with ESP32 hardware.

## Architecture

- **FastAPI**: Core web framework handling REST routes and WebSockets.
- **aiomqtt**: Asynchronous MQTT client for subscribing to sensor telemetry and publishing control commands.
- **Pydantic**: Data validation for API requests and incoming MQTT JSON payloads.

## System Flow

1. **Hardware (ESP32)** publishes sensor data to `ozone/live`.
2. **Backend (FastAPI)** subscribes to `ozone/live`, validates the JSON payload, and stores the latest state in memory.
3. **Backend** broadcasts the latest update to all active frontend clients via WebSocket (`/ws/ozone`).
4. **Frontend (Next.js)** sends REST commands to the backend (`/control/electrode`, etc.).
5. **Backend** publishes those commands as JSON to `ozone/control` for the ESP32 to execute.

---

## Setup & Running Locally

### 1. Prerequisites
- Python 3.10+
- An MQTT Broker (e.g., Mosquitto) running locally or remotely.

### 2. Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (recommended):
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Linux/Mac:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### 3. Configuration

You can configure the backend by modifying `app/core/config.py` or by setting environment variables (or creating a `.env` file in the `backend/` directory):

```env
MQTT_BROKER=localhost
MQTT_PORT=1883
# MQTT_USER=optional_username
# MQTT_PASSWORD=optional_password
```

### 4. Running the Server

Start the FastAPI application using Uvicorn:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Once running, you can view the interactive API documentation (Swagger UI) at:
[http://localhost:8000/docs](http://localhost:8000/docs)

---

## Example MQTT Payloads

### Simulated Sensor Data (`ozone/live`)

To simulate the ESP32 sending data, you can publish a message to `ozone/live`.

Using `mosquitto_pub`:
```bash
mosquitto_pub -h localhost -t "ozone/live" -m '{"ozone_ppm": 0.025, "voltage": 220.4, "current": 0.82, "active_modules": 3, "electrode_a": true, "electrode_b": false, "electrode_c": true, "sensor_status": "online", "timestamp": "2026-03-08T15:00:00"}'
```

---

## Example REST Requests (Control API)

You can test these endpoints directly from the Swagger UI (`/docs`), or use `curl`:

**1. Set an Electrode State**
```bash
curl -X 'POST' \
  'http://localhost:8000/control/electrode' \
  -H 'Content-Type: application/json' \
  -d '{
  "cmd": "set_electrode",
  "electrode": "A",
  "state": true
}'
```

**2. Set Module Count**
```bash
curl -X 'POST' \
  'http://localhost:8000/control/module-count' \
  -H 'Content-Type: application/json' \
  -d '{
  "cmd": "set_module_count",
  "count": 4
}'
```

**3. Emergency Stop**
```bash
curl -X 'POST' \
  'http://localhost:8000/control/emergency-stop' \
  -H 'Content-Type: application/json' \
  -d '{
  "cmd": "emergency_stop"
}'
```

## WebSocket

Connect to the WebSocket at `ws://localhost:8000/ws/ozone` to receive live JSON broadcasts every time a valid message is published to `ozone/live`.

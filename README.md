# Ozone Generator Dashboard

A full-stack IoT monitoring and control system for an ozone generator, built as a university capstone project. The system acquires real-time sensor data from an ESP32 microcontroller and displays it on a live web dashboard.

---

## System Architecture

```
[ESP32 + MQ-131 Sensor]
        |
        | MQTT over TLS (HiveMQ Cloud)
        |
[FastAPI Backend]  <──WebSocket──>  [Next.js Frontend Dashboard]
        |
[Mosquitto MQTT Broker]  (local Docker, optional)
        |
[Nginx Reverse Proxy]
        |
[Cloudflare Tunnel]  (optional public access)
```

---

## Features

- Real-time ozone concentration (PPM) monitoring via MQ-131 sensor
- Live voltage and current readings from the generator circuit
- Three-electrode level control (0 / 1 / 2 / 3 active modules)
- Local / Remote operating mode toggle (physical button or dashboard)
- Auto-shutoff timer per electrode
- OLED display on the ESP32 showing WiFi, MQTT status, and electrode states
- Scheduled ON/OFF control from the browser dashboard
- Emergency stop command

---

## Repository Structure

```
.
├── ESP_Controll/              # PlatformIO ESP32 firmware (C++)
│   └── Ozone_generator_control/
│       └── src/main.cpp
├── backend/                   # FastAPI backend service (Python)
│   └── app/
├── frontend/                  # Next.js dashboard (TypeScript / React)
│   └── src/
├── mosquitto/                 # Mosquitto MQTT broker config
├── nginx/                     # Nginx reverse proxy config
├── docker-compose.yml         # Full stack Docker Compose
└── README.md
```

---

## Prerequisites

| Component | Version |
|---|---|
| Node.js | 20+ |
| Python | 3.11+ |
| Docker + Docker Compose | Latest |
| PlatformIO | Latest (VS Code extension) |
| HiveMQ Cloud account | Free tier sufficient |

---

## Configuration

### 1. ESP32 Firmware

Open `ESP_Controll/Ozone_generator_control/src/main.cpp` and set your credentials:

```cpp
const char* WIFI_SSID       = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD   = "YOUR_WIFI_PASSWORD";

const char* mqtt_server     = "YOUR_HIVEMQ_HOST.s1.eu.hivemq.cloud";
const char* mqtt_username   = "YOUR_MQTT_USERNAME";
const char* mqtt_password   = "YOUR_MQTT_PASSWORD";
```

Also update `platformio.ini`:
```ini
upload_port = COMX    ; e.g. COM3 on Windows, /dev/ttyUSB0 on Linux
monitor_port = COMX
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Edit .env.local with your API and WebSocket URLs
```

Open `frontend/src/lib/mqttClient.ts` and set your HiveMQ credentials:

```typescript
const MQTT_BROKER_URL = 'wss://YOUR_HIVEMQ_HOST.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USERNAME   = 'YOUR_MQTT_USERNAME';
const MQTT_PASSWORD   = 'YOUR_MQTT_PASSWORD';
```

---

## Running with Docker Compose

```bash
# Start all services (MQTT broker, backend, frontend, nginx, cloudflare tunnel)
docker-compose up --build

# Access the dashboard at:
# http://localhost   (via Nginx)
```

---

## Flashing the ESP32 Firmware

1. Open `ESP_Controll/Ozone_generator_control/` in VS Code with PlatformIO installed.
2. Connect your ESP32 via USB.
3. Set the correct `upload_port` and `monitor_port` in `platformio.ini`.
4. Click **Upload** in PlatformIO, or run:
   ```bash
   pio run --target upload
   ```

---

## MQTT Topics

| Topic | Direction | Description |
|---|---|---|
| `ozone/live` | ESP32 → Dashboard | Live JSON sensor payload (1 Hz) |
| `ozone/control` | Dashboard → ESP32 | JSON command messages |

### Control Command Examples

```json
// Set electrode level
{ "cmd": "set_level", "level": 2 }

// Switch mode
{ "cmd": "set_mode", "mode": "remote" }

// Emergency stop
{ "cmd": "emergency_stop" }
```

---

## Hardware Pin Reference (ESP32)

| Function | GPIO |
|---|---|
| Button — Electrode 1 | 14 |
| Button — Electrode 2 | 32 |
| Button — Electrode 3 | 27 |
| Button — Mode Toggle | 26 |
| Relay 1 | 16 |
| Relay 2 | 17 |
| Relay 3 | 18 |
| OLED SDA | 21 |
| OLED SCL | 22 |
| MQ-131 Sensor | 34 |
| Voltage Sensor | 36 |
| Current Sensor (ACS) | 35 |
| Mode LED | 33 |

---

## License

This project is released for educational and demonstration purposes.

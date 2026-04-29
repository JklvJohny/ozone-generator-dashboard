# Ozone Generator Dashboard - Realtime Next.js Frontend

This frontend is explicitly tailored to interface with the FastAPI backend for the university IoT Ozone monitoring system. It implements a strict, dark-themed industrial aesthetic while relying entirely on a native WebSocket connection to reflect true hardware states without localized guessing or optimistic faking.

## Exact Backend Contract
This application assumes the following backend environment is active on the same machine:
- **REST Base**: `http://localhost:8000`
- **WS Target**: `ws://localhost:8000/ws/ozone`

## Key Architecture Features

1. **Initial Hydration**: On hard-refresh, `app/page.tsx` executes an immediate `GET /sensor/latest` to populate the frontend state without waiting for the next MQTT telemetry broadcast.
2. **Websocket Domination**: Once the initial payload is loaded, control is fully handed over to the custom `useOzoneWebSocket` hook. This hook maintains up to 50 active telemetry points for the `Recharts` sliding visualizer and updates all gauge logic.
3. **Strict Control Mapping**: The interactive control panel sends `POST /control/...` requests specifically mapping to `Electrode A/B/C`, `modules`, and the `emergency-stop` routines. It displays visual spinning loaders during transitions but relies entirely on the WebSocket to flip the actual visual switch states back (verifying the ESP32 received it).

## Setup & Running Locally

### 1. Prerequisites
- Node.js (v18+)
- Backend FastAPI server running on `:8000`

### 2. Installation
Navigate to the frontend directory and install the pre-configured dependencies.
```bash
cd frontend
npm install
```

### 3. Startup
Start the Next.js App Router development server:
```bash
npm run dev
```

Open a browser to [http://localhost:3000](http://localhost:3000) for the live demonstration.

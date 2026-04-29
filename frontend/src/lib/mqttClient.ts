/**
 * HiveMQ Cloud MQTT Client (browser-side, via WebSocket Secure)
 * Directly subscribes to sensor data and publishes control commands from the browser.
 */

import mqtt, { MqttClient } from 'mqtt';

// ─── Config ────────────────────────────────────────────────────────────────
const MQTT_BROKER_URL = 'wss://YOUR_HIVEMQ_HOST.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USERNAME   = 'YOUR_MQTT_USERNAME';
const MQTT_PASSWORD   = 'YOUR_MQTT_PASSWORD';

export const TOPIC_LIVE    = 'ozone/live';    // ESP32 publish → browser subscribe
export const TOPIC_CONTROL = 'ozone/control'; // browser publish → ESP32 subscribe

// ─── Singleton client ──────────────────────────────────────────────────────
let _client: MqttClient | null = null;

export function getMqttClient(): MqttClient {
  if (_client) return _client;

  _client = mqtt.connect(MQTT_BROKER_URL, {
    username:        MQTT_USERNAME,
    password:        MQTT_PASSWORD,
    reconnectPeriod: 3000,   // Reconnect every 3 seconds on disconnect
    keepalive:       60,
    clean:           true,
    // Generate a unique client ID per browser tab
    clientId: `ozone-dashboard-${Math.random().toString(16).slice(2, 8)}`,
  });

  _client.on('connect',    () => console.log('[MQTT] Connected to HiveMQ Cloud'));
  _client.on('reconnect',  () => console.log('[MQTT] Reconnecting...'));
  _client.on('error',  (e) => console.error('[MQTT] Error', e));
  _client.on('offline',    () => console.warn('[MQTT] Offline'));

  return _client;
}

// ─── Commands ──────────────────────────────────────────────────────────────

/** Sets the electrode level: 0 = all OFF, 1 = A, 2 = A+B, 3 = A+B+C */
export function sendSetLevel(level: 0 | 1 | 2 | 3): void {
  getMqttClient().publish(TOPIC_CONTROL, JSON.stringify({ cmd: 'set_level', level }));
}

/** Sends a legacy electrode command (supports optional auto-off duration in seconds) */
export function sendSetElectrode(electrode: 'A' | 'B' | 'C', state: boolean, duration?: number): void {
  const payload: Record<string, unknown> = { cmd: 'set_electrode', electrode, state };
  if (state && duration && duration > 0) payload.duration = duration;
  getMqttClient().publish(TOPIC_CONTROL, JSON.stringify(payload));
}

/** Emergency stop */
export function sendEmergencyStop(): void {
  getMqttClient().publish(TOPIC_CONTROL, JSON.stringify({ cmd: 'emergency_stop' }));
}

/** Switches the device operating mode: "local" or "remote" */
export function sendSetMode(mode: 'local' | 'remote'): void {
  getMqttClient().publish(TOPIC_CONTROL, JSON.stringify({ cmd: 'set_mode', mode }));
}

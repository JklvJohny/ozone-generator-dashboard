/**
 * useOzoneMqtt - React hook that subscribes to the 'ozone/live' MQTT topic from HiveMQ Cloud.
 * Returns live sensor data, history buffer, and connection state.
 */

import { useState, useEffect } from 'react';
import { SensorData } from '../types/sensor';
import { getMqttClient, TOPIC_LIVE } from './mqttClient';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export function useOzoneMqtt(initialData: SensorData | null) {
  const [data, setData]                       = useState<SensorData | null>(initialData);
  const [history, setHistory]                 = useState<SensorData[]>(initialData ? [initialData] : []);
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    const client = getMqttClient();

    // Connection state handlers
    const onConnect = () => {
      setConnectionState('connected');
      client.subscribe(TOPIC_LIVE, { qos: 0 });
    };
    const onReconnect  = () => setConnectionState('connecting');
    const onOffline    = () => setConnectionState('disconnected');
    const onError      = () => setConnectionState('disconnected');

    // Incoming data handler from ESP32
    const onMessage = (topic: string, payload: Buffer) => {
      if (topic !== TOPIC_LIVE) return;
      try {
        const parsed = JSON.parse(payload.toString()) as SensorData;
        parsed.voltage = 12.3;
        setData(parsed);
        setHistory(prev => {
          const next = [...prev, parsed];
          return next.length > 50 ? next.slice(next.length - 50) : next;
        });
      } catch (e) {
        console.error('[MQTT] Failed to parse message', e);
      }
    };

    client.on('connect',   onConnect);
    client.on('reconnect', onReconnect);
    client.on('offline',   onOffline);
    client.on('error',     onError);
    client.on('message',   onMessage);

    // If the client is already connected, subscribe immediately
    if (client.connected) {
      setConnectionState('connected');
      client.subscribe(TOPIC_LIVE, { qos: 0 });
    }

    return () => {
      client.unsubscribe(TOPIC_LIVE);
      client.off('connect',   onConnect);
      client.off('reconnect', onReconnect);
      client.off('offline',   onOffline);
      client.off('error',     onError);
      client.off('message',   onMessage);
    };
  }, []);

  return { data, history, connectionState };
}

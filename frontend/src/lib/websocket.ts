import { useState, useEffect, useCallback, useRef } from 'react';
import { SensorData } from '../types/sensor';
import { WS_BASE_URL } from './config';

export type ConnectionState = "connecting" | "connected" | "disconnected";

export function useOzoneWebSocket(initialData: SensorData | null) {
    const [data, setData] = useState<SensorData | null>(initialData);
    const [history, setHistory] = useState<SensorData[]>(initialData ? [initialData] : []);
    const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
    const wsRef = useRef<WebSocket | null>(null);

    // If initialData changes (e.g., from a REST fetch), ensure it's in our state
    useEffect(() => {
        if (initialData && !data) {
            setData(initialData);
            setHistory([initialData]);
        }
    }, [initialData, data]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const connect = () => {
            if (wsRef.current?.readyState === WebSocket.OPEN) return;

            const wsUrl = WS_BASE_URL;

            setConnectionState("connecting");
            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('Connected to WebSocket');
                setConnectionState("connected");
            };

            ws.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data) as SensorData;

                    setData(parsed);

                    setHistory((prev) => {
                        const newHistory = [...prev, parsed];
                        // Limit history to 50 points
                        if (newHistory.length > 50) {
                            return newHistory.slice(newHistory.length - 50);
                        }
                        return newHistory;
                    });

                } catch (e) {
                    console.error("Failed to parse WebSocket message", e);
                }
            };

            ws.onclose = () => {
                console.log('Disconnected from WebSocket');
                setConnectionState("disconnected");
                // Attempt to reconnect in 3s
                timeoutId = setTimeout(connect, 3000);
            };

            wsRef.current = ws;
        };

        connect();

        return () => {
            clearTimeout(timeoutId);
            if (wsRef.current) {
                // Prevent auto-reconnect logic on intentional unmounts
                wsRef.current.onclose = null;
                wsRef.current.close();
            }
        };
    }, []);

    return { data, history, connectionState };
}

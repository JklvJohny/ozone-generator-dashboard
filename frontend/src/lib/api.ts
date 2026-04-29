import { SensorData } from "../types/sensor";
import { SetElectrodeCommand, SetModuleCountCommand, EmergencyStopCommand } from "../types/control";
import { API_BASE_URL } from "./config";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options?.headers as Record<string, string>),
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
        let errorDetail = `API Error: ${response.statusText}`;
        try {
            const errorData = await response.json();
            errorDetail = errorData.detail || errorDetail;
        } catch {
            // JSON parse error, ignore and use statusText
        }
        throw new Error(errorDetail);
    }

    return response.json();
}

export const ozoneApi = {
    getLatestSensor: () => {
        return fetchApi<SensorData>("/sensor/latest");
    },

    setElectrode: (command: Omit<SetElectrodeCommand, "cmd">) => {
        // We only send electrode and state in body per backend request format
        return fetchApi("/control/electrode", {
            method: "POST",
            body: JSON.stringify(command),
        });
    },

    setModuleCount: (count: number) => {
        // Only send count
        return fetchApi("/control/module-count", {
            method: "POST",
            body: JSON.stringify({ count }),
        });
    },

    emergencyStop: () => {
        return fetchApi("/control/emergency-stop", {
            method: "POST",
            body: JSON.stringify({}),
        });
    }
};


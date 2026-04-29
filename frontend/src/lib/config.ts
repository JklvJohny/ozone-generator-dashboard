/**
 * Utility to resolve the API and WebSocket URLs dynamically.
 * Provides absolute URLs when running server-side, and relative Single-Origin URLs when in browser.
 */

export function getApiUrl(): string {
    if (typeof window === "undefined") {
        return "http://backend:8000";
    }
    return "/api";
}

export function getWsUrl(): string {
    if (typeof window === "undefined") {
        return "ws://backend:8000/ws/ozone";
    }
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    return `${protocol}//${host}/ws/ozone`;
}

export const API_BASE_URL = getApiUrl();
export const WS_BASE_URL = getWsUrl();

import json
from fastapi import WebSocket
from typing import List
from app.core.logger import app_logger

class ConnectionManager:
    """
    Manages active WebSocket connections.
    """
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        app_logger.info(f"WebSocket client connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            app_logger.info(f"WebSocket client disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """
        Broadcasts a JSON dictionary message to all connected clients.
        """
        if not self.active_connections:
            return
            
        json_msg = json.dumps(message)
        dead_connections = []
        
        for connection in self.active_connections:
            try:
                await connection.send_text(json_msg)
            except Exception as e:
                app_logger.error(f"Error sending message to client: {e}")
                dead_connections.append(connection)
                
        # Clean up any connections that threw errors
        for dead in dead_connections:
            self.disconnect(dead)

# Create a singleton instance to be used across the application
websocket_manager = ConnectionManager()

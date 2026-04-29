from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.services.websocket_manager import websocket_manager
from app.core.logger import app_logger

router = APIRouter()

@router.websocket("/ozone")

async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for broadcasting live sensor data to frontends.
    """

    await websocket_manager.connect(websocket)
    try:
        while True:
            # We don't expect the client to send much data, but we need to keep the 
            # connection open and handle potential client disconnects gracefully.
            data = await websocket.receive_text()
            app_logger.debug(f"Received unexpected message from WS client: {data}")
            
    except WebSocketDisconnect:
        websocket_manager.disconnect(websocket)
    except Exception as e:
        app_logger.error(f"WebSocket connection error: {e}")
        websocket_manager.disconnect(websocket)

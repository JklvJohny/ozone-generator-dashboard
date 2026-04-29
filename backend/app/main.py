from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.logger import app_logger
from app.api import sensor, control, websocket
from app.services.mqtt_service import mqtt_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the lifecycle of the FastAPI application.
    """
    app_logger.info("Starting up Ozone Dashboard API...")
    
    # Start the MQTT client in the background
    mqtt_service.start_background_task()
    
    yield
    
    app_logger.info("Shutting down Ozone Dashboard API...")
    
    # Clean up the MQTT background task gracefully
    await mqtt_service.stop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    lifespan=lifespan,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(sensor.router, prefix="/sensor", tags=["Sensors"])
app.include_router(control.router, prefix="/control", tags=["Control"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to the Ozone Generator Dashboard API",
        "docs": "/docs"
    }

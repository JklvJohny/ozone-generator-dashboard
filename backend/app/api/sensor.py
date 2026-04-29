from fastapi import APIRouter, HTTPException
from app.schemas.sensor import SensorDataPayload
from app.services.ozone_service import ozone_service

router = APIRouter()

@router.get("/latest", response_model=SensorDataPayload)
async def get_latest_sensor_data():
    """
    Retrieves the most recent sensor reading received from the MQTT broker.
    """
    latest_data = ozone_service.get_latest_data()
    
    if not latest_data:
        raise HTTPException(status_code=404, detail="No sensor data received yet.")
        
    return latest_data

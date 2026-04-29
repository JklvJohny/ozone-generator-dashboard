from typing import Optional
from app.schemas.sensor import SensorDataPayload

class OzoneService:
    """
    Provides an in-memory store for the latest sensor data.
    """
    def __init__(self):
        self._latest_data: Optional[SensorDataPayload] = None

    def update_sensor_data(self, data: SensorDataPayload):
        """
        Updates the most recently received sensor reading.
        """
        self._latest_data = data

    def get_latest_data(self) -> Optional[SensorDataPayload]:
        """
        Retrieves the most recently received sensor reading.
        """
        return self._latest_data

# Create a singleton instance
ozone_service = OzoneService()

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class SensorDataPayload(BaseModel):
    """
    Represents the JSON payload received from the ESP32 via MQTT.
    """
    ozone_ppm: float = Field(..., description="Ozone concentration in PPM")
    voltage: float = Field(..., description="Operating voltage in Volts")
    current: float = Field(..., description="Operating current in Amps")
    active_modules: int = Field(..., description="Number of currently active ozone modules")
    electrode_a: bool = Field(..., description="State of electrode A")
    electrode_b: bool = Field(..., description="State of electrode B")
    electrode_c: bool = Field(..., description="State of electrode C")
    sensor_status: str = Field(..., description="Status of the sensor (e.g., online, offline, error)")
    mode: Optional[str] = Field(None, description="Operating mode: local or remote")
    timestamp: datetime = Field(..., description="Timestamp of the reading")

    class Config:
        json_schema_extra = {
            "example": {
                "ozone_ppm": 0.025,
                "voltage": 220.4,
                "current": 0.82,
                "active_modules": 3,
                "electrode_a": True,
                "electrode_b": False,
                "electrode_c": True,
                "sensor_status": "online",
                "timestamp": "2026-03-08T15:00:00"
            }
        }

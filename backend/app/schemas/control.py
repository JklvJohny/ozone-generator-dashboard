from pydantic import BaseModel, Field
from typing import Literal, Optional


class BaseCommand(BaseModel):
    """
    Base class for all commands.
    """
    cmd: str = Field(..., description="The command identifier")


class SetElectrodeCommand(BaseCommand):
    """
    Command to explicitly control a specific electrode.
    """
    cmd: Literal["set_electrode"] = "set_electrode"
    electrode: Literal["A", "B", "C"] = Field(..., description="The targeted electrode (A, B, or C)")
    state: bool = Field(..., description="Desired state (true for ON, false for OFF)")
    duration: Optional[int] = Field(None, description="Optional countdown timer in seconds before turning OFF automatically")

    class Config:
        json_schema_extra = {
            "example": {
                "cmd": "set_electrode",
                "electrode": "A",
                "state": True
            }
        }


class SetModuleCountCommand(BaseCommand):
    """
    Command to set the total number of active ozone generating modules.
    """
    cmd: Literal["set_module_count"] = "set_module_count"
    count: int = Field(..., ge=0, description="The desired number of active modules")

    class Config:
        json_schema_extra = {
            "example": {
                "cmd": "set_module_count",
                "count": 4
            }
        }


class EmergencyStopCommand(BaseCommand):
    """
    Command to immediately halt all ozone generation.
    """
    cmd: Literal["emergency_stop"] = "emergency_stop"

    class Config:
        json_schema_extra = {
            "example": {
                "cmd": "emergency_stop"
            }
        }

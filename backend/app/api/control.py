from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from app.schemas.control import SetElectrodeCommand, SetModuleCountCommand, EmergencyStopCommand
from app.services.mqtt_service import mqtt_service

router = APIRouter()

@router.post("/electrode")
async def control_electrode(command: SetElectrodeCommand):
    """
    Publish a command to set a specific electrode's state.
    """
    success = await mqtt_service.publish_command(command)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to publish command to MQTT broker.")
    return {"message": "Electrode command published successfully", "command": command}


@router.post("/module-count")
async def control_module_count(command: SetModuleCountCommand):
    """
    Publish a command to set the target number of active modules.
    """
    success = await mqtt_service.publish_command(command)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to publish command to MQTT broker.")
    return {"message": "Module count command published successfully", "command": command}


@router.post("/emergency-stop")
async def emergency_stop(command: EmergencyStopCommand):
    """
    Publish an emergency stop command.
    """
    success = await mqtt_service.publish_command(command)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to publish command to MQTT broker.")
    return {"message": "Emergency stop command published successfully", "command": command}

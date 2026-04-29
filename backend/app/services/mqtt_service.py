import asyncio
import json
from app.core.config import settings
from app.core.logger import app_logger
from app.schemas.sensor import SensorDataPayload
from app.schemas.control import BaseCommand
from app.services.ozone_service import ozone_service
from app.services.websocket_manager import websocket_manager

import aiomqtt
from pydantic import ValidationError

class MQTTService:
    """
    Asynchronous MQTT client handling connections, subscribing, and publishing.
    """
    def __init__(self):
        self.client: aiomqtt.Client | None = None
        self._task: asyncio.Task | None = None

    async def connect_and_loop(self):
        """
        Connects to the broker and starts the listener loop. Keeps trying on failure.
        """
        while True:
            try:
                # Use context manager for aiomqtt.Client
                # Note: aiomqtt syntax for connection:
                app_logger.info(f"Connecting to MQTT broker at {settings.MQTT_BROKER}:{settings.MQTT_PORT}...")
                
                async with aiomqtt.Client(
                    hostname=settings.MQTT_BROKER,
                    port=settings.MQTT_PORT,
                    username=settings.MQTT_USER,
                    password=settings.MQTT_PASSWORD,
                ) as client:
                    self.client = client
                    app_logger.info("Connected to MQTT broker safely.")
                    
                    # Subscribe to the live sensor topic
                    await client.subscribe(settings.MQTT_TOPIC_LIVE)
                    app_logger.info(f"Subscribed to topic: {settings.MQTT_TOPIC_LIVE}")
                    
                    # Listen for messages
                    async for message in client.messages:
                        await self._handle_message(message)
                        
            except aiomqtt.MqttError as e:
                app_logger.error(f"MQTT Error: {e}. Reconnecting in 5 seconds...")
                self.client = None
                await asyncio.sleep(5)
            except Exception as e:
                app_logger.exception(f"Unexpected MQTT exception: {e}")
                self.client = None
                await asyncio.sleep(5)

    async def _handle_message(self, message: aiomqtt.Message):
        """
        Parses incoming payload, updates in-memory state, and broadcasts via WS.
        """
        try:
            payload_str = message.payload.decode("utf-8")
            topic = str(message.topic)
            
            if topic == settings.MQTT_TOPIC_LIVE:
                # Parse JSON string into dictionary
                data_dict = json.loads(payload_str)
                
                # Validate with Pydantic
                sensor_data = SensorDataPayload(**data_dict)
                
                # Update in-memory state
                ozone_service.update_sensor_data(sensor_data)
                
                # Broadcast raw dictionary via WebSockets to all connected frontends
                # Convert datetime to string for json serialization if passing model_dump
                await websocket_manager.broadcast(sensor_data.model_dump(mode="json"))
                
        except json.JSONDecodeError:
            app_logger.error(f"Received malformed JSON payload on {message.topic}: {message.payload}")
        except ValidationError as e:
            app_logger.error(f"Payload validation failed for {message.topic}: {e.errors()}")
        except Exception as e:
            app_logger.exception(f"Error handling MQTT message: {e}")

    async def publish_command(self, command: BaseCommand):
        """
        Publishes a command to the control topic.
        """
        if not self.client:
            app_logger.error("Cannot publish command. MQTT client is not connected.")
            return False
            
        try:
            payload = command.model_dump_json()
            await self.client.publish(settings.MQTT_TOPIC_CONTROL, payload)
            app_logger.info(f"Published command to {settings.MQTT_TOPIC_CONTROL}: {payload}")
            return True
        except Exception as e:
            app_logger.error(f"Failed to publish command: {e}")
            return False

    def start_background_task(self):
        """
        Starts the event loop in the background. Call this on App Startup.
        """
        self._task = asyncio.create_task(self.connect_and_loop())
    
    async def stop(self):
        """
        Cancels the background task. Call this on App Shutdown.
        """
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            app_logger.info("MQTT listener task stopped.")

# Singleton instance
mqtt_service = MQTTService()

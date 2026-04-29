import secrets
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    # API Settings
    PROJECT_NAME: str = "Ozone Generator Dashboard API"
    API_V1_STR: str = "/api/v1"
    
    # MQTT Settings
    MQTT_BROKER: str = Field(default="localhost", env="MQTT_BROKER")
    MQTT_PORT: int = Field(default=1883, env="MQTT_PORT")
    MQTT_USER: str | None = Field(default=None, env="MQTT_USER")
    MQTT_PASSWORD: str | None = Field(default=None, env="MQTT_PASSWORD")
    
    # MQTT Topics
    MQTT_TOPIC_LIVE: str = "ozone/live"
    MQTT_TOPIC_CONTROL: str = "ozone/control"

    # Auth Settings removed

    # CORS settings (for local dev — allow all common local origins)
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://[::1]:3000",
        "*",
    ]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")


settings = Settings()

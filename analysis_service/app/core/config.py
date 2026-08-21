from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    SERVICE_NAME: str = "analysis_service"
    PORT: int = 8001
    RULE_VERSION: str = "1.0.0-hadlock-intergrowth"
    MODEL_VERSION: str = "1.0.0-racanet-v1"

    model_config = ConfigDict(env_file=".env", extra="ignore")

settings = Settings()

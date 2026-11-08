from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "postgresql+asyncpg://sereno:sereno@localhost:5432/sereno"
    secret_key: str = Field(min_length=32)
    environment: str = "development"
    origin: str = "http://localhost:5173"
    cookie_secure: bool = False
    outbox_dir: str = "outbox"

    @model_validator(mode="after")
    def production(self):
        if self.environment == "production" and not self.cookie_secure:
            raise ValueError("Production requires secure cookies")
        return self


@lru_cache
def settings() -> Settings:
    return Settings()

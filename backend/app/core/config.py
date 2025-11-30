from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "duagon CompactPCI Serial Configurator"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "sqlite:///./sql_app.db"
    
    # Email Settings
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = None
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAILS_FROM_EMAIL: str | None = "info@example.com"
    EMAILS_FROM_NAME: str | None = "System Configurator"
    SALES_EMAIL: str | None = "sales@example.com"
    
    # Auth
    ADMIN_PASSWORD: str = "admin" # Default fallback

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

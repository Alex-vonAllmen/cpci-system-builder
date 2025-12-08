from sqlalchemy import Column, Integer, String, Text
from app.db.session import Base

class ExampleConfig(Base):
    __tablename__ = "example_configs"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String)
    config_json = Column(Text) # Stores the full configuration state as JSON string
    image_url = Column(String, nullable=True)

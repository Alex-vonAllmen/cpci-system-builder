from sqlalchemy import Column, Integer, String, Text
from app.db.session import Base

class ExampleConfig(Base):
    __tablename__ = "example_configs"

    id = Column(Integer, primary_key=True, index=True)
    example_number = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, index=True)
    description = Column(String)
    config_json = Column(Text) # Stores the full configuration state as JSON string
    image_url = Column(String, nullable=True)

from pydantic import BaseModel
from typing import Optional

class ExampleConfigBase(BaseModel):
    name: str
    description: str
    config_json: str
    image_url: Optional[str] = None

class ExampleConfigCreate(ExampleConfigBase):
    pass

class ExampleConfigUpdate(ExampleConfigBase):
    pass

class ExampleConfig(ExampleConfigBase):
    id: int

    class Config:
        from_attributes = True

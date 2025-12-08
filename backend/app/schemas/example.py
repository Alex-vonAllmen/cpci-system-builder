from pydantic import BaseModel
from typing import Optional, Any

class ExampleConfigBase(BaseModel):
    name: str
    description: str
    config_json: Any
    image_url: Optional[str] = None

class ExampleConfigCreate(ExampleConfigBase):
    id: str

class ExampleConfigUpdate(ExampleConfigBase):
    pass

class ExampleConfigImport(ExampleConfigBase):
    id: Optional[str] = None

class ExampleConfig(ExampleConfigBase):
    id: str

    class Config:
        from_attributes = True

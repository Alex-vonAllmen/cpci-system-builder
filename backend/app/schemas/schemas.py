from pydantic import BaseModel
from typing import List, Optional, Any, Dict

# Product Schemas
class ProductBase(BaseModel):
    id: str
    type: str
    name: str
    description: Optional[str] = None
    power_watts: float
    width_hp: int
    price_1: float
    price_25: float
    price_50: float
    price_100: float
    price_250: float
    price_500: float
    image_url: Optional[str] = None
    url: Optional[str] = None
    eol_date: Optional[str] = None
    height_u: Optional[int] = None
    options: Optional[Any] = None
    external_interfaces: Optional[List[Dict[str, Any]]] = None
    
    # Internal Interfaces (Phase 2)
    # Map<SlotOffset, Map<ConnectorID, List[Interface]>>
    provided_interfaces: Optional[Dict[str, Dict[str, List[str]]]] = None 
    # Map<ConnectorID, List[Interface]>
    required_interfaces: Optional[Dict[str, List[str]]] = None

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    class Config:
        from_attributes = True

# Rule Schemas
class RuleBase(BaseModel):
    description: str
    category: Optional[str] = None
    definition: dict

class RuleCreate(RuleBase):
    pass

class Rule(RuleBase):
    id: int
    class Config:
        from_attributes = True

class RuleImport(RuleBase):
    id: Optional[int] = None

# Configuration Schemas
class ConfigItemBase(BaseModel):
    product_id: str
    slot_position: int
    sub_options: Optional[Any] = None

class ConfigItemCreate(ConfigItemBase):
    pass

class ConfigItem(ConfigItemBase):
    id: int
    configuration_id: int
    class Config:
        from_attributes = True

class ConfigurationBase(BaseModel):
    user_details: Optional[Any] = None

class ConfigurationCreate(ConfigurationBase):
    items: List[ConfigItemCreate]

class Configuration(ConfigurationBase):
    id: int
    items: List[ConfigItem]
    class Config:
        from_attributes = True

# System Settings Schemas
class SystemSettingBase(BaseModel):
    key: str
    value: str

class SystemSettingCreate(SystemSettingBase):
    pass

class SystemSetting(SystemSettingBase):
    class Config:
        from_attributes = True

class QuoteRequest(BaseModel):
    user: dict
    config: dict
    items: list
    totalCost: float
    pdf_base64: Optional[str] = None
    json_base64: Optional[str] = None

# Article Schemas
class ArticleBase(BaseModel):
    article_number: str
    product_id: str
    selected_options: Dict[str, Any]

class ArticleCreate(ArticleBase):
    pass

class Article(ArticleBase):
    id: int
    class Config:
        from_attributes = True

class ArticleImport(ArticleBase):
    id: Optional[int] = None

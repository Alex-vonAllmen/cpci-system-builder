from sqlalchemy import Column, Integer, String, Float, JSON, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
from app.db.session import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)  # Part Number
    type = Column(String, index=True)  # CPU, Peripheral, Chassis, etc.
    name = Column(String)
    description = Column(String, nullable=True)
    power_watts = Column(Float)
    width_hp = Column(Integer)
    price_1 = Column(Float)
    price_25 = Column(Float)
    price_50 = Column(Float)
    price_100 = Column(Float)
    price_250 = Column(Float)
    price_500 = Column(Float)
    image_url = Column(String, nullable=True)
    url = Column(String, nullable=True)
    eol_date = Column(String, nullable=True) # YYYY-MM-DD
    height_u = Column(Integer, nullable=True) # Rack Unit Height (3 or 4)
    connectors = Column(JSON, nullable=True) # List of strings ["P1", "P2", ...]
    options = Column(JSON, nullable=True)  # e.g., {"conformal_coating": true}
    interfaces = Column(JSON, nullable=True) # { "pcie_x1": 2, "sata": 1, ... }
    external_interfaces = Column(JSON, nullable=True) # [{ "type": "Ethernet", "connector": "RJ45", "count": 1 }]

    # Relationships can be added here if needed

class Rule(Base):
    __tablename__ = "rules"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String)
    category = Column(String, nullable=True)
    definition = Column(JSON) # Stores the full rule logic (conditions, actions)

class Configuration(Base):
    __tablename__ = "configurations"

    id = Column(Integer, primary_key=True, index=True)
    user_details = Column(JSON)  # {name, project, eau}
    items = relationship("ConfigItem", back_populates="configuration")

class ConfigItem(Base):
    __tablename__ = "config_items"

    id = Column(Integer, primary_key=True, index=True)
    configuration_id = Column(Integer, ForeignKey("configurations.id"))
    product_id = Column(String, ForeignKey("products.id"))
    slot_position = Column(Integer)
    sub_options = Column(JSON, nullable=True)

    configuration = relationship("Configuration", back_populates="items")
    product = relationship("Product")

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String)

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    article_number = Column(String, unique=True, index=True)
    product_id = Column(String, ForeignKey("products.id"))
    selected_options = Column(JSON) # { "option_id": "value" }

    product = relationship("Product")

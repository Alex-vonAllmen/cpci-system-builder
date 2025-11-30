from app.db.session import SessionLocal, engine, Base
from app.models import models
import json

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Initialize DB session
db = SessionLocal()

# Define initial products
products = [
    {
        "id": "G25A",
        "type": "cpu",
        "name": "G25A Intel Xeon",
        "description": "Intel Xeon E3-1500 v5, 32GB RAM, 4HP",
        "power_watts": 35,
        "width_hp": 4,
        "price_1": 2500,
        "price_25": 2400,
        "price_50": 2300,
        "price_100": 2200,
        "price_250": 2100,
        "price_500": 2000,
        "options": [
            {
                "id": "ram",
                "label": "Memory",
                "type": "select",
                "choices": [
                    { "label": "16GB DDR4", "value": "16gb", "priceMod": 0 },
                    { 
                        "label": "32GB DDR4", 
                        "value": "32gb", 
                        "priceMod": { "1": 200, "25": 190, "50": 180, "100": 170, "250": 160, "500": 150 } 
                    },
                ],
                "default": "16gb"
            },
            {
                "id": "coating",
                "label": "Conformal Coating",
                "type": "boolean",
                "priceMod": { "1": 50, "25": 48, "50": 46, "100": 44, "250": 42, "500": 40 },
                "default": False
            }
        ]
    },
    {
        "id": "G28",
        "type": "cpu",
        "name": "G28 Intel Core i7",
        "description": "Intel Core i7-6600EQ, 16GB RAM, 4HP",
        "power_watts": 25,
        "width_hp": 4,
        "price_1": 1800,
        "price_25": 1750,
        "price_50": 1700,
        "price_100": 1650,
        "price_250": 1600,
        "price_500": 1550,
    },
    {
        "id": "G51",
        "type": "storage",
        "name": "G51 NVMe Carrier",
        "description": "Quad M.2 NVMe SSD Carrier",
        "power_watts": 10,
        "width_hp": 4,
        "price_1": 450,
        "price_25": 440,
        "price_50": 430,
        "price_100": 420,
        "price_250": 410,
        "price_500": 400,
        "options": [
            {
                "id": "drive1",
                "label": "Drive Slot 1",
                "type": "select",
                "choices": [
                    { "label": "None", "value": "none", "priceMod": 0 },
                    { "label": "512GB NVMe", "value": "512gb", "priceMod": { "1": 100, "25": 95, "50": 90, "100": 85, "250": 80, "500": 75 } },
                    { "label": "1TB NVMe", "value": "1tb", "priceMod": { "1": 180, "25": 170, "50": 160, "100": 150, "250": 140, "500": 130 } },
                ],
                "default": "none"
            }
        ]
    },
    {
        "id": "G239",
        "type": "io",
        "name": "G239 5G Carrier",
        "description": "Dual M.2 5G/LTE Modem Carrier",
        "power_watts": 12,
        "width_hp": 4,
        "price_1": 600,
        "price_25": 580,
        "price_50": 560,
        "price_100": 540,
        "price_250": 520,
        "price_500": 500,
        "options": [
            {
                "id": "slot1",
                "label": "M.2 Slot 1 (Modem)",
                "type": "select",
                "choices": [
                    { "label": "Empty", "value": "none", "priceMod": 0 },
                    { "label": "5G Modem (Sub-6GHz)", "value": "modem_5g_sub6", "priceMod": { "1": 250, "25": 240, "50": 230, "100": 220, "250": 210, "500": 200 } },
                    { "label": "4G/LTE Modem", "value": "modem_4g", "priceMod": { "1": 150, "25": 145, "50": 140, "100": 135, "250": 130, "500": 125 } },
                ],
                "default": "none"
            },
            {
                "id": "slot2",
                "label": "M.2 Slot 2 (Modem)",
                "type": "select",
                "choices": [
                    { "label": "Empty", "value": "none", "priceMod": 0 },
                    { "label": "5G Modem (Sub-6GHz)", "value": "modem_5g_sub6", "priceMod": { "1": 250, "25": 240, "50": 230, "100": 220, "250": 210, "500": 200 } },
                    { "label": "4G/LTE Modem", "value": "modem_4g", "priceMod": { "1": 150, "25": 145, "50": 140, "100": 135, "250": 130, "500": 125 } },
                ],
                "default": "none"
            }
        ]
    },
    {
        "id": "G52",
        "type": "storage",
        "name": "G52 SATA Carrier",
        "description": "2.5\" SATA SSD/HDD Carrier",
        "power_watts": 5,
        "width_hp": 4,
        "price_1": 300,
        "price_25": 290,
        "price_50": 280,
        "price_100": 270,
        "price_250": 260,
        "price_500": 250,
        "options": []
    },
    {
        "id": "G211",
        "type": "network",
        "name": "G211 Gigabit Ethernet",
        "description": "4-port Gigabit Ethernet Controller",
        "power_watts": 8,
        "width_hp": 4,
        "price_1": 550,
        "price_25": 540,
        "price_50": 530,
        "price_100": 520,
        "price_250": 510,
        "price_500": 500,
        "options": []
    },
    {
        "id": "G215",
        "type": "io",
        "name": "G215 Serial I/O",
        "description": "8-port RS-232/422/485",
        "power_watts": 3,
        "width_hp": 4,
        "price_1": 400,
        "price_25": 390,
        "price_50": 380,
        "price_100": 370,
        "price_250": 360,
        "price_500": 350,
        "options": []
    },
    {
        "id": "C_4U_84HP",
        "type": "chassis",
        "name": "4U 19\" Rack Mount Chassis",
        "description": "4U, 84HP, 9-slot backplane support",
        "power_watts": 0,
        "width_hp": 84,
        "height_u": 4,
        "price_1": 900,
        "price_25": 880,
        "price_50": 860,
        "price_100": 840,
        "price_250": 820,
        "price_500": 800,
        "options": [
            {
                "id": "fan_tray",
                "label": "Fan Tray",
                "type": "boolean",
                "priceMod": { "1": 150, "25": 145, "50": 140, "100": 135, "250": 130, "500": 125 },
                "default": True
            },
            {
                "id": "shelf_controller",
                "label": "Shelf Controller",
                "type": "boolean",
                "priceMod": { "1": 200, "25": 190, "50": 180, "100": 170, "250": 160, "500": 150 },
                "default": False
            }
        ]
    },
    {
        "id": "C_4U_40HP",
        "type": "chassis",
        "name": "4U Compact Chassis",
        "description": "4U, 40HP, 5-slot backplane support",
        "power_watts": 0,
        "width_hp": 40,
        "height_u": 4,
        "price_1": 750,
        "price_25": 730,
        "price_50": 710,
        "price_100": 690,
        "price_250": 670,
        "price_500": 650,
        "options": [
            {
                "id": "fan_tray",
                "label": "Fan Tray",
                "type": "boolean",
                "priceMod": { "1": 150, "25": 145, "50": 140, "100": 135, "250": 130, "500": 125 },
                "default": True
            },
            {
                "id": "shelf_controller",
                "label": "Shelf Controller",
                "type": "boolean",
                "priceMod": { "1": 200, "25": 190, "50": 180, "100": 170, "250": 160, "500": 150 },
                "default": False
            }
        ]
    },
    {
        "id": "C_3U_84HP",
        "type": "chassis",
        "name": "3U 19\" Rack Mount Chassis",
        "description": "3U, 84HP, 9-slot backplane support",
        "power_watts": 0,
        "width_hp": 84,
        "height_u": 3,
        "price_1": 800,
        "price_25": 780,
        "price_50": 760,
        "price_100": 740,
        "price_250": 720,
        "price_500": 700,
        "options": [
            {
                "id": "shelf_controller",
                "label": "Shelf Controller",
                "type": "boolean",
                "priceMod": { "1": 200, "25": 190, "50": 180, "100": 170, "250": 160, "500": 150 },
                "default": False
            }
        ]
    },
    {
        "id": "C_3U_40HP",
        "type": "chassis",
        "name": "3U Compact Chassis",
        "description": "3U, 40HP, 5-slot backplane support",
        "power_watts": 0,
        "width_hp": 40,
        "height_u": 3,
        "price_1": 650,
        "price_25": 630,
        "price_50": 610,
        "price_100": 590,
        "price_250": 570,
        "price_500": 550,
        "options": [
            {
                "id": "shelf_controller",
                "label": "Shelf Controller",
                "type": "boolean",
                "priceMod": { "1": 200, "25": 190, "50": 180, "100": 170, "250": 160, "500": 150 },
                "default": False
            }
        ]
    },
    {
        "id": "P_3U_300W",
        "type": "psu",
        "name": "300W Pluggable PSU",
        "description": "3U, 8HP, 300W Output",
        "power_watts": 0,
        "width_hp": 8,
        "height_u": 3,
        "price_1": 350,
        "price_25": 340,
        "price_50": 330,
        "price_100": 320,
        "price_250": 310,
        "price_500": 300,
        "options": []
    },
    {
        "id": "P_4U_600W",
        "type": "psu",
        "name": "600W Open Frame PSU",
        "description": "Internal mounting (Rear), 600W Output",
        "power_watts": 0,
        "width_hp": 0,
        "height_u": 4,
        "price_1": 250,
        "price_25": 240,
        "price_50": 230,
        "price_100": 220,
        "price_250": 210,
        "price_500": 200,
        "options": []
    },
    {
        "id": "FILLER_4HP",
        "type": "accessory",
        "name": "Empty Front Bezel 4HP",
        "description": "Filler panel for empty slots",
        "power_watts": 0,
        "width_hp": 4,
        "price_1": 25,
        "price_25": 24,
        "price_50": 23,
        "price_100": 22,
        "price_250": 21,
        "price_500": 20,
    },
]

def seed():
    print("Seeding database...")
    for p_data in products:
        # Generate URL based on ID
        p_data["url"] = f"https://www.duagon.com/products/details/{p_data['id']}/"
        # Default EOL date
        if "eol_date" not in p_data:
            p_data["eol_date"] = "2030-12-31"
        
        # Default height_u
        if "height_u" not in p_data:
            p_data["height_u"] = 3 # Default to 3U for cards

        # Default connectors
        if "connectors" not in p_data:
            if p_data["type"] == "cpu":
                p_data["connectors"] = ["P1", "P2", "P3", "P4", "P5", "P6"]
            elif p_data["type"] in ["storage", "network", "io", "carrier"]:
                p_data["connectors"] = ["P1"] # Minimum mandatory
            else:
                p_data["connectors"] = [] # Chassis, PSU, etc.

        
        # Check if exists
        existing = db.query(models.Product).filter(models.Product.id == p_data["id"]).first()
        if not existing:
            print(f"Creating {p_data['name']}")
            product = models.Product(**p_data)
            db.add(product)
        else:
            print(f"Updating {p_data['name']}")
            # Update fields
            for key, value in p_data.items():
                setattr(existing, key, value)
    
    # Seed Settings
    central_email = db.query(models.SystemSetting).filter(models.SystemSetting.key == "central_email").first()
    if not central_email:
        print("Setting default central email")
        db.add(models.SystemSetting(key="central_email", value="alexander.vonallmen@duagon.com"))

    db.commit()
    print("Seeding complete.")

if __name__ == "__main__":
    seed()

from app.db.session import SessionLocal, engine, Base
from app.models import models
from app.models.example import ExampleConfig
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
        "interfaces": {
            "pcie_x4": 4,
            "pcie_x1": 4,
            "sata": 4,
            "usb_2": 8,
            "usb_3": 4,
            "eth_1g": 2,
            "gpio": 16
        },
        "external_interfaces": [
            { "type": "Ethernet", "connector": "RJ45", "count": 2 },
            { "type": "USB", "connector": "Type-A", "count": 2 },
            { "type": "Display", "connector": "DisplayPort", "count": 1 }
        ],
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
        "interfaces": {
            "pcie_x4": 8,
            "pcie_x1": 8,
            "sata": 4,
            "usb_2": 8,
            "usb_3": 6,
            "eth_1g": 2,
            "gpio": 16
        },
        "external_interfaces": [
            { "type": "Ethernet", "connector": "RJ45", "count": 2 },
            { "type": "Display", "connector": "DisplayPort", "count": 2 }
        ],
    },
    {
        "id": "G029M",
        "type": "cpu",
        "name": "G029M Intel Xeon D",
        "description": "Intel Xeon D-1500, 4HP (expandable)",
        "power_watts": 45,
        "width_hp": 4,
        "price_1": 2800,
        "price_25": 2700,
        "price_50": 2600,
        "price_100": 2500,
        "price_250": 2400,
        "price_500": 2300,
        "interfaces": {
            "pcie_x8": 2,
            "pcie_x4": 4,
            "sata": 6,
            "usb_3": 4,
            "eth_10g": 2,
            "gpio": 16
        },
        "options": [
            {
                "id": "interface",
                "label": "Interface Option",
                "type": "select",
                "choices": [
                    { "label": "Standard (GbE)", "value": "std", "priceMod": 0, "widthMod": 0, "powerMod": 0 },
                    { "label": "High Performance (10GbE)", "value": "10gbe", "priceMod": 500, "widthMod": 4, "powerMod": 15 }
                ],
                "default": "std"
            }
        ]
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
        "interfaces": {
            "pcie_x4": 1
        },
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
        "interfaces": {
            "usb_3": 1
        },
        "options": [
            {
                "id": "slot1",
                "label": "M.2 Slot 1 (Modem)",
                "type": "select",
                "choices": [
                    { "label": "Empty", "value": "none", "priceMod": 0, "powerMod": 0 },
                    { 
                        "label": "5G Modem (Sub-6GHz)", 
                        "value": "modem_5g_sub6", 
                        "priceMod": { "1": 250, "25": 240, "50": 230, "100": 220, "250": 210, "500": 200 }, 
                        "powerMod": 10,
                        "externalInterfacesMod": [
                            { "type": "Antenna", "connector": "SMA", "count": 2 }
                        ]
                    },
                    { 
                        "label": "4G/LTE Modem", 
                        "value": "modem_4g", 
                        "priceMod": { "1": 150, "25": 145, "50": 140, "100": 135, "250": 130, "500": 125 }, 
                        "powerMod": 5,
                        "externalInterfacesMod": [
                            { "type": "Antenna", "connector": "SMA", "count": 2 }
                        ]
                    },
                ],
                "default": "none"
            },
            {
                "id": "slot2",
                "label": "M.2 Slot 2 (Modem)",
                "type": "select",
                "choices": [
                    { "label": "Empty", "value": "none", "priceMod": 0, "powerMod": 0 },
                    { 
                        "label": "5G Modem (Sub-6GHz)", 
                        "value": "modem_5g_sub6", 
                        "priceMod": { "1": 250, "25": 240, "50": 230, "100": 220, "250": 210, "500": 200 }, 
                        "powerMod": 10,
                        "externalInterfacesMod": [
                            { "type": "Antenna", "connector": "SMA", "count": 2 }
                        ]
                    },
                    { 
                        "label": "4G/LTE Modem", 
                        "value": "modem_4g", 
                        "priceMod": { "1": 150, "25": 145, "50": 140, "100": 135, "250": 130, "500": 125 }, 
                        "powerMod": 5,
                        "externalInterfacesMod": [
                            { "type": "Antenna", "connector": "SMA", "count": 2 }
                        ] 
                    },
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
        "interfaces": {
            "sata": 1
        },
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
        "interfaces": {
            "pcie_x1": 1
        },
        "external_interfaces": [
            { "type": "Ethernet", "connector": "RJ45", "count": 4 }
        ],
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
        "interfaces": {
            "pcie_x1": 1
        },
        "external_interfaces": [
            { "type": "Serial", "connector": "D-Sub", "count": 8 }
        ],
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
        "description": "3U, 8HP, Pluggable Power Supply",
        "power_watts": -300,
        "width_hp": 8,
        "height_u": 3,
        "connectors": ["AC Input"],
        "price_1": 200,
        "price_25": 190,
        "price_50": 180,
        "price_100": 170,
        "price_250": 160,
        "price_500": 150,
        "external_interfaces": [
            { "type": "Power", "connector": "AC Input", "count": 1 }
        ],
        "options": []
    },
    {
        "id": "P_4U_600W",
        "type": "psu",
        "name": "600W Open Frame PSU",
        "description": "Internal mounting (Rear), 600W Output",
        "power_watts": -600,
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
        "type": "miscellaneous",
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

    # Seed Rules
    rules = [
        {
            "description": "Forbid 40HP Chassis if > 40HP width",
            "definition": {
                "conditions": [
                    { "type": "system_property", "property": "totalWidth", "operator": "gt", "value": 40 }
                ],
                "actions": [
                    { "type": "forbid", "componentId": "C_4U_40HP", "message": "4U Compact Chassis (40HP) cannot support current configuration width." },
                    { "type": "forbid", "componentId": "C_3U_40HP", "message": "3U Compact Chassis (40HP) cannot support current configuration width." }
                ]
            }
        },
        {
            "description": "Forbid 84HP Chassis if > 84HP width",
            "definition": {
                "conditions": [
                    { "type": "system_property", "property": "totalWidth", "operator": "gt", "value": 84 }
                ],
                "actions": [
                    { "type": "forbid", "componentId": "C_4U_84HP", "message": "4U Rack Mount Chassis (84HP) cannot support current configuration width." },
                    { "type": "forbid", "componentId": "C_3U_84HP", "message": "3U Rack Mount Chassis (84HP) cannot support current configuration width." }
                ]
            }
        },
        {
            "description": "G239 not allowed adjacent to System Slot",
            "definition": {
                "conditions": [
                    {
                        "type": "adjacency",
                        "componentId": "G239",
                        "adjacentTo": "system_slot"
                    }
                ],
                "actions": [
                ]
            }
        },
        {
            "description": "Fan Tray required for > 120W",
            "category": "chassis_compliance",
            "definition": {
                "conditions": [
                    { "type": "system_property", "property": "requiredPower", "operator": "gt", "value": 120 },
                    { "type": "option_not_selected", "componentType": "chassis", "optionId": "fan_tray", "value": True }
                ],
                "actions": [
                    { "type": "forbid", "message": "System power exceeds 120W. You must select a chassis with a Fan Tray enabled." }
                ]
            }
        }
    ]

    for r_data in rules:
        existing_rule = db.query(models.Rule).filter(models.Rule.description == r_data["description"]).first()
        if not existing_rule:
            print(f"Creating rule: {r_data['description']}")
            db.add(models.Rule(**r_data))
        else:
            print(f"Updating rule: {r_data['description']}")
            existing_rule.definition = r_data["definition"]

    # Seed Examples
    examples = [
        {
            "example_number": "EX-BASIC-3U",
            "name": "Basic Control System",
            "description": "A simple 3U CompactPCI Serial system with CPU and Power Supply.",
            "config_json": json.dumps({
                "slotCount": 10,
                "systemSlotPosition": "left",
                "chassisId": "C_3U_40HP",
                "psuId": "P_3U_300W",
                "slots": [
                    {"id": 1, "type": "psu", "componentId": "P_3U_300W", "selectedOptions": {}, "width": 8, "blockedBy": None},
                    {"id": 2, "type": "psu", "componentId": "P_3U_300W", "selectedOptions": {}, "width": 4, "blockedBy": 1},
                    {"id": 3, "type": "system", "componentId": "G25A", "selectedOptions": {}, "width": 4},
                    {"id": 4, "type": "peripheral", "componentId": "G51", "selectedOptions": {}, "width": 4},
                    {"id": 5, "type": "peripheral", "componentId": "G211", "selectedOptions": {}, "width": 4},
                    {"id": 6, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 7, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 8, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 9, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 10, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4}
                ]
            }),
            "image_url": "https://www.duagon.com/fileadmin/_processed_/c/6/csm_G25A_front_1_d2b0c9c0c3.png"
        },
        {
            "example_number": "EX-DATA-LOGGER",
            "name": "High Performance Data Logger",
            "description": "4U System with G28 CPU, multiple storage and network interfaces.",
            "config_json": json.dumps({
                "slotCount": 21,
                "systemSlotPosition": "left",
                "chassisId": "C_4U_84HP",
                "psuId": "P_4U_600W",
                "slots": [
                    {"id": 1, "type": "system", "componentId": "G28", "selectedOptions": {}, "width": 4},
                    {"id": 2, "type": "peripheral", "componentId": "G51", "selectedOptions": {}, "width": 4},
                    {"id": 3, "type": "peripheral", "componentId": "G51", "selectedOptions": {}, "width": 4},
                    {"id": 4, "type": "peripheral", "componentId": "G211", "selectedOptions": {}, "width": 4},
                    {"id": 5, "type": "peripheral", "componentId": "G211", "selectedOptions": {}, "width": 4},
                    {"id": 6, "type": "peripheral", "componentId": "G239", "selectedOptions": {}, "width": 4},
                    {"id": 7, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 8, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 9, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 10, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 11, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 12, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 13, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 14, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 15, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 16, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 17, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 18, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 19, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 20, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4},
                    {"id": 21, "type": "peripheral", "componentId": None, "selectedOptions": {}, "width": 4}
                ]
            }),
            "image_url": "https://www.duagon.com/fileadmin/_processed_/5/1/csm_G28_front_1_7a0a0a0a0a.png"
        }
    ]

    for ex_data in examples:
        existing_ex = db.query(ExampleConfig).filter(ExampleConfig.name == ex_data["name"]).first()
        if not existing_ex:
            print(f"Creating example: {ex_data['name']}")
            db.add(ExampleConfig(**ex_data))
        else:
            print(f"Updating example: {ex_data['name']}")
            existing_ex.description = ex_data["description"]
            existing_ex.config_json = ex_data["config_json"]
            existing_ex.image_url = ex_data["image_url"]

    db.commit()
    db.commit()
    print("Seeding complete.")

    # Seed Articles
    articles = [
        {
            "article_number": "G25A-16GB-3",
            "product_id": "G25A",
            "selected_options": {"ram": "16gb", "conformal_coating": False}
        },
        {
            "article_number": "G25A-32GB-CC-3",
            "product_id": "G25A",
            "selected_options": {"ram": "32gb", "conformal_coating": True}
        },
        {
            "article_number": "G211-STD",
            "product_id": "G211",
            "selected_options": {}
        }
    ]

    for art_data in articles:
        existing = db.query(models.Article).filter(models.Article.article_number == art_data["article_number"]).first()
        if not existing:
            print(f"Creating article: {art_data['article_number']}")
            db.add(models.Article(**art_data))
        else:
             print(f"Updating article: {art_data['article_number']}")
             existing.product_id = art_data["product_id"]
             existing.selected_options = art_data["selected_options"]
    db.commit()

if __name__ == "__main__":
    seed()

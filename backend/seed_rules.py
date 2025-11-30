from app.db.session import SessionLocal
from app.models import models
import json

db = SessionLocal()

rules_data = [
    {
        "description": "G28 in slot 1 forbids G239 in slot 2",
        "definition": {
            "conditions": [{ "type": "component_selected", "componentId": "G28", "slotIndex": 1 }],
            "actions": [{ "type": "forbid", "componentId": "G239", "slotIndex": 2, "message": "G239 cannot be in slot 2 if G28 is in slot 1" }]
        }
    },
    {
        "description": "G28 in slot 9 forbids G239 in slot 8",
        "definition": {
            "conditions": [{ "type": "component_selected", "componentId": "G28", "slotIndex": 9 }],
            "actions": [{ "type": "forbid", "componentId": "G239", "slotIndex": 8, "message": "G239 cannot be in slot 8 if G28 is in slot 9" }]
        }
    },
    {
        "description": "3U Chassis forbids 4U PSU",
        "definition": {
            "conditions": [{ "type": "system_property", "property": "chassisId", "operator": "contains", "value": "3U" }],
            "actions": [{ "type": "forbid", "componentId": "P_4U_600W", "message": "4U PSU incompatible with 3U Chassis" }]
        }
    },
    {
        "description": "More than 5 slots forbids Compact Chassis",
        "definition": {
            "conditions": [{ "type": "system_property", "property": "slotCount", "operator": "gt", "value": 5 }],
            "actions": [
                { "type": "forbid", "componentId": "C_3U_40HP", "message": "Compact chassis supports max 5 slots" },
                { "type": "forbid", "componentId": "C_4U_40HP", "message": "Compact chassis supports max 5 slots" }
            ]
        }
    }
]

print("Seeding rules...")
# Clear existing rules
db.query(models.Rule).delete()

for r in rules_data:
    rule = models.Rule(description=r["description"], definition=r["definition"])
    db.add(rule)

db.commit()
print("Rules seeded.")

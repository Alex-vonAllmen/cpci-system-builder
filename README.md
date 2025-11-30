# CPCI System Builder

A web-based configurator for CompactPCI systems, allowing users to build custom systems by selecting chassis, power supplies, and components for individual slots. It includes a robust rules engine to ensure configuration validity and an admin panel for managing products and rules.

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- npm

### Backend Setup
The backend is built with FastAPI and SQLite.

1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment:
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Initialize the database:
    ```bash
    python seed.py
    ```
5.  Run the server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The API will be available at `http://localhost:8000`.

### Frontend Setup
The frontend is built with React, Vite, and TailwindCSS.

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

## Usage Guide

### User (Configurator)
1.  **Start**: Navigate to the home page.
2.  **Chassis Selection**: Choose a chassis and power supply.
3.  **Slot Configuration**:
    *   Click on a slot in the visualizer or the list.
    *   Select a compatible component from the available list.
    *   Configure options (e.g., memory, storage) if available.
    *   **Rules**: The system will prevent selecting incompatible components and display alerts if rules are violated.
4.  **Review**: Check the system topology and total price.

### Admin Panel
Access the admin panel at `/admin` (e.g., `http://localhost:5173/admin`).
*   **Login**: Default credentials are `admin` / `admin`.
*   **Products**:
    *   View, Create, Edit, and Delete products.
    *   Define product properties (power, dimensions, price).
    *   Define configuration options using JSON (see below).
*   **Rules**:
    *   View, Create, Edit, and Delete configuration rules.
    *   Define logic using JSON (see below).
*   **Settings**: Manage global system settings.

## Technical Documentation

### Product Configuration Options (JSON)
When creating or editing a product, you can define configurable options (like RAM size or optional add-ons) using a JSON array.

**Structure:**
```json
[
  {
    "id": "string",          // Unique ID for the option
    "label": "string",       // Display label
    "type": "select" | "boolean",
    "default": "value",      // Default value
    // For 'select' type:
    "choices": [
      {
        "label": "string",
        "value": "string",
        "priceMod": number   // Price addition for this choice
      }
    ],
    // For 'boolean' type:
    "priceMod": number       // Price addition if true
  }
]
```

**Example:**
```json
[
  {
    "id": "ram",
    "label": "Memory",
    "type": "select",
    "default": "16gb",
    "choices": [
      { "label": "16GB", "value": "16gb", "priceMod": 0 },
      { "label": "32GB", "value": "32gb", "priceMod": 200 }
    ]
  },
  {
    "id": "coating",
    "label": "Conformal Coating",
    "type": "boolean",
    "default": false,
    "priceMod": 50
  }
]
```

### Rules Engine (JSON)
Rules enforce compatibility and constraints. They are defined as JSON objects with `conditions` and `actions`.

**Structure:**
```json
{
  "conditions": [
    // Condition Type 1: Component Selected
    {
      "type": "component_selected",
      "componentId": "string", // ID of the component to check for
      "slotIndex": number      // (Optional) Specific slot ID to check
    },
    // Condition Type 2: System Property
    {
      "type": "system_property",
      "property": "slotCount" | "chassisId",
      "operator": "gt" | "lt" | "eq" | "contains",
      "value": any
    }
  ],
  "actions": [
    {
      "type": "forbid",
      "componentId": "string", // Component to forbid
      "slotIndex": number,     // (Optional) Specific slot to forbid it in
      "message": "string"      // Error message to display
    }
  ]
}
```

**Logic:**
*   **Conditions**: All conditions in the list must be true (AND logic) for the rule to trigger.
*   **Actions**: If triggered, the specified components are forbidden.

**Examples:**

1.  **G28 in Slot 1 forbids G239 in Slot 2:**
    ```json
    {
      "conditions": [
        { "type": "component_selected", "componentId": "G28", "slotIndex": 1 }
      ],
      "actions": [
        { "type": "forbid", "componentId": "G239", "slotIndex": 2, "message": "G28 in Slot 1 forbids G239 in Slot 2" }
      ]
    }
    ```

2.  **Slot Count > 5 forbids specific chassis:**
    ```json
    {
      "conditions": [
        { "type": "system_property", "property": "slotCount", "operator": "gt", "value": 5 }
      ],
      "actions": [
        { "type": "forbid", "componentId": "C_3U_40HP", "message": "Chassis too small for >5 slots" }
      ]
    }
    ```

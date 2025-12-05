# cPCI System Builder

A modern, web-based configurator for CompactPCI (cPCI) systems. This application allows users to design custom cPCI systems by selecting chassis, power supplies, and various plugin components (CPU, Storage, Network, I/O) while enforcing compatibility rules.

## Features

*   **Visual System Topology**: Interactive visualization of the system backplane and slots.
*   **Rule-Based Configuration**: Intelligent rule engine prevents incompatible component selections (e.g., "If G28 is in Slot 1, G239 is forbidden in Slot 2").
*   **Dynamic Pricing**: Real-time price calculation with tiered pricing support (1+, 25+, 50+, etc.).
*   **Admin Dashboard**: comprehensive admin panel to manage:
    *   **Products**: Create, edit, and delete components.
    *   **Rules**: Define flexible JSON-based compatibility rules.
    *   **Settings**: Configure system-wide settings like the central quote email.
*   **Internal Interfaces Management**: Track and validate internal interface usage (PCIe, SATA, USB, etc.) to ensure CPU capacity is not exceeded.
*   **External Interfaces Management**: Manage and summarize external physical connectors (Ethernet, USB, Serial, etc.) on the front/rear panel.
*   **Quote Generation**: Generate PDF quotes with detailed configuration summaries.
*   **Modern UI**: Built with React, Tailwind CSS, and Shadcn UI for a polished user experience.
*   **Toast Notifications**: Non-intrusive feedback for user actions and errors.

## Tech Stack

*   **Frontend**: React, TypeScript, Vite, Tailwind CSS, Zustand (State Management), React Router.
*   **Backend**: FastAPI (Python), SQLAlchemy (SQLite), Pydantic.

## Installation

### Prerequisites

*   Node.js (v18+)
*   Python (v3.10+)

### Backend Setup

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
5.  Start the server:
    ```bash
    uvicorn app.main:app --reload
    ```
    The API will be available at `http://localhost:8000`.

### Frontend Setup

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

### Quick Start

To start both the backend and frontend simultaneously, you can use the provided helper script:

```bash
./start-app.sh
```

## Usage

### User Flow
1.  **Topology**: View the system layout.
2.  **Components**: Select components for each slot. The system will prevent invalid selections based on defined rules.
3.  **Chassis**: Choose a chassis and power supply.
4.  **Quote**: Review the configuration and request a formal quote.

### Admin Flow
1.  Navigate to `/admin`.
2.  Login with the admin password (default: `admin`).
3.  Use the tabs to manage Products, Settings, and Rules.

## JSON Schemas

### Product Options
Product options (e.g., RAM, Storage size) are defined as a JSON array in the Product editor:

```json
[
  {
    "id": "ram",
    "label": "Memory",
    "type": "select",
    "choices": [
      { "value": "16GB", "label": "16GB DDR4", "priceMod": 0 },
      { "value": "32GB", "label": "32GB DDR4", "priceMod": 150 }
    ],
    "default": "16GB"
  }
]
```

### Rules
Rules are defined in the Admin > Rules tab using a flexible JSON format. Supported condition types include `component_selected`, `system_property`, and `adjacency`.

Example Adjacency Rule:
```json
{
  "conditions": [
    {
      "type": "adjacency",
      "componentId": "G239",
      "adjacentTo": "system_slot"
    }
  ],
  "actions": [
    {
      "type": "forbid",
      "componentId": "G239",
      "message": "G239 cannot be placed in the slot adjacent to the System Slot."
    }
  ]
}
```

## License

Proprietary - duagon AG

## ToDo


- Add external interfaces available (e.g., 2x USB 3.2 Gen 2) - DONE
- Power dependant requirement for fan tray - DONE
- Matching product options to article numbers
- Improve PDF quote generation
- Instead of selecting slots at the beginning, you should select half- or full 19"-inch rack; information in centimeters instead of HP, U - DONE
- Example configurations based on existings - DONE
  - SBB Rack
  - OMTS Rack
  - SBB APFZ
- Number of available PCIe lanes (e.g., two G506A with fat pipes) - DONE
- Number of SATA lanes - DONE
- Number of available USB ports - DONE

## Issues
- PDF quote only contains single prices
- Rule with G239 in slot 2 does not work if G28 is in slot 1 and extends to slot 2 - SOLVED
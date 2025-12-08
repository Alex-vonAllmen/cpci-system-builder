# cPCI System Builder

A modern, web-based configurator for CompactPCI (cPCI) systems. This application allows users to design custom cPCI systems by selecting chassis, power supplies, and various plugin components (CPU, Storage, Network, I/O) while enforcing compatibility rules.

## Features

*   **Visual System Topology**: Interactive visualization of the system backplane and slots.
*   **Rule-Based Configuration**: Intelligent rule engine prevents incompatible component selections (e.g., "If G28 is in Slot 1, G239 is forbidden in Slot 2").
*   **Dynamic Pricing**: Real-time price calculation with tiered pricing support (1+, 25+, 50+, etc.).
*   **Article Matching**: Automatically matches configured product options to pre-defined Article Numbers for accurate quoting.
*   **Admin Dashboard**: comprehensive admin panel to manage:
    *   **Products**: Create, edit, and delete components.
    *   **Rules**: Define flexible JSON-based compatibility rules.
    *   **Articles**: Manage article numbers mapped to specific product configurations.
    *   **Settings**: Configure system-wide settings like the central quote email.
*   **Internal Interfaces Management**: Track and validate internal interface usage (PCIe, SATA, USB, etc.) to ensure CPU capacity is not exceeded.
*   **External Interfaces Management**: Manage and summarize external physical connectors (Ethernet, USB, Serial, etc.) on the front/rear panel.
*   **Quote Generation**: Generate PDF quotes with detailed configuration summaries.
*   **Modern UI**: Built with React, Tailwind CSS, and Shadcn UI for a polished user experience.
*   **Toast Notifications**: Non-intrusive feedback for user actions and errors.

## Tech Stack

*   **Frontend**:
    *   **Core**: React, TypeScript, Vite
    *   **UI/Styling**: Tailwind CSS, Lucide React, clsx, tailwind-merge
    *   **State Management**: Zustand
    *   **Routing**: React Router
    *   **Utilities**: jsPDF, jsPDF-AutoTable
*   **Backend**:
    *   **Framework**: FastAPI, Uvicorn
    *   **Database**: SQLAlchemy (SQLite)
    *   **Configuration**: Pydantic Settings

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

## Deployment

### Productive Environment (Linux + Apache)

This deployment method uses Apache as a reverse proxy for the Backend (FastAPI) and to serve the Frontend (Static Files).

**Prerequisites:**
*   Linux Server (e.g., Ubuntu/Debian)
*   Apache2
*   Python 3.10+
*   Node.js 18+

**1. Setup Directory:**
Clone the repository to `/var/www/cpci-system-builder`:
```bash
sudo git clone <repository-url> /var/www/cpci-system-builder
sudo chown -R $USER:$USER /var/www/cpci-system-builder
```

**2. Configure Apache:**
*   Enable required modules:
    ```bash
    sudo a2enmod rewrite proxy proxy_http ssl headers
    ```
*   Copy the site configuration:
    ```bash
    sudo cp /var/www/cpci-system-builder/deployment/cpci-site.conf /etc/apache2/sites-available/cpci-system.conf
    ```
*   Enable the site:
    ```bash
    sudo a2dissite 000-default.conf  # Optional: disable default
    sudo a2ensite cpci-system.conf
    sudo systemctl reload apache2
    ```

**3. Start Application:**
You can use the provided startup script to build the frontend and start the backend:

```bash
cd /var/www/cpci-system-builder
./deployment/start_prod.sh
```

**Note:** For a persistent production setup, it is recommended to run the backend as a systemd service.

**Systemd Service Example (`/etc/systemd/system/cpci-backend.service`):**
```ini
[Unit]
Description=duagon cPCI System Builder Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/cpci-system-builder/backend
Environment="PATH=/var/www/cpci-system-builder/backend/venv/bin"
ExecStart=/var/www/cpci-system-builder/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always

[Install]
WantedBy=multi-user.target
```

## License

Proprietary - duagon AG

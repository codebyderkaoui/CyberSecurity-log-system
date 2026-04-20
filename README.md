# CyberLog — Cybersecurity Log & Incident Management System

A full-stack Security Operations Center (SOC) dashboard built with **Python + MySQL** on the backend and **React** on the frontend. Designed as an academic project demonstrating real-world cybersecurity monitoring concepts.

![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square&logo=python)
![Flask](https://img.shields.io/badge/Flask-3.x-black?style=flat-square&logo=flask)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![MySQL](https://img.shields.io/badge/MySQL-8.x-orange?style=flat-square&logo=mysql)

---

## Features

**Backend (Python + Flask + MySQL)**
- Full REST API with API key authentication
- Role-based access control — `admin` (full access) and `analyst` (read-only)
- Log management with soft-delete (audit trail preserved)
- Incident tracker with status and severity management
- Anomaly detection — brute force, port scans, off-hours logins, data exfiltration
- Weekly report generation with CSV export
- Input validation and IP address format checking

**Frontend (React + Vite)**
- Login page with role-based session management
- Dashboard — live log feed, incident summary, event type breakdown
- Logs page — paginated table, multi-field filters, log detail panel
- Incidents page — kanban board (Open / Investigating / Resolved), inline status updates
- Anomaly detection page — live detection results with severity indicators
- Reports page — weekly stats, charts, CSV export buttons
- Settings page — API config, alert thresholds, monitored event types
- Real-time alert notifications (polling-based, persistent for critical severity)

---

## Project Structure

```
CyberSecurity-log-system/
│
├── api.py                      # Flask REST API layer
├── main.py                     # CLI entry point
├── generate_sample_data.py     # Seed script for demo data
├── requirements.txt            # Python dependencies
│
├── db/
│   ├── connection.py           # MySQL connection helper
│   ├── config.py               # DB credentials (not committed — see config_template.py)
│   ├── config_template.py      # Template — copy to config.py and fill in your values
│   ├── cybersec_logs.sql       # Full database dump with schema and seed data
│   └── migrate_soft_delete.py  # Migration: adds is_archived column (if needed)
│
├── models/
│   ├── log_model.py            # Log CRUD operations
│   └── incident_model.py       # Incident CRUD operations
│
├── analysis/
│   ├── anomaly_detection.py    # Detection algorithms
│   └── reports.py              # Report generation
│
├── utils/
│   ├── auth.py                 # API key auth + RBAC decorators
│   ├── validators.py           # Input validation helpers
│   └── export.py               # CSV export utilities
│
├── tests/                      # Unit tests
├── exports/                    # CSV export output directory
├── Documentation/              # Project documentation
│
└── cyberlog-frontend/          # React frontend (Vite)
    ├── src/
    │   ├── App.jsx             # Main app + Dashboard, Logs, Incidents pages
    │   ├── AnomaliesAndReports.jsx
    │   ├── LoginAlertSettings.jsx
    │   └── index.css
    └── package.json
```

---

## Prerequisites

- Python 3.10+
- MySQL 8.x
- Node.js 18+ and npm
- pip

---

## Backend Setup

### 1. Clone the repository

```bash
git clone https://github.com/codebyderkaoui/CyberSecurity-log-system.git
cd CyberSecurity-log-system
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure database credentials

Copy the template and fill in your MySQL credentials:

```bash
cp db/config_template.py db/config.py
```

Edit `db/config.py`:

```python
host     = "localhost"
user     = "root"
password = "your_mysql_password"
database = "cybersec_logs"
```

> `db/config.py` is in `.gitignore` and will never be committed.

### 4. Set your API keys

Open `api.py` and set your API keys via environment variables before starting the server:

```bash
export ADMIN_API_KEY="your-strong-admin-key"
export ANALYST_API_KEY="your-strong-analyst-key"
```

Or edit the fallback values in `utils/auth.py` for local development only.

### 5. Import the database

```bash
mysql -u root -p < db/cybersec_logs.sql
```

This creates the `cybersec_logs` database, all tables (`logs`, `incidents`, `users`), views, stored procedures, and loads the seed data.

### 6. (Optional) Run the soft-delete migration

Only needed if you imported an older version of the database that doesn't have the `is_archived` column:

```bash
python db/migrate_soft_delete.py
```

### 7. Start the API server

```bash
python api.py
```

The API will be available at `http://localhost:5000`. Visit `http://localhost:5000/api/health` to verify it's connected.

---

## Frontend Setup

### 1. Navigate to the frontend directory

```bash
cd cyberlog-frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

> The frontend gets its API key from the login session — no environment file needed. Log in with the credentials below and the key is handled automatically.

---

## API Reference

All endpoints (except `/api/health`) require an `X-API-Key` header.

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | Public | Health check |
| GET | `/api/logs` | Any | Get logs (supports filters) |
| POST | `/api/logs` | Admin | Create log entry |
| PUT | `/api/logs/<id>` | Admin | Update log entry |
| DELETE | `/api/logs/<id>` | Admin | Soft-delete log |
| GET | `/api/logs/archived` | Admin | View archived logs |
| GET | `/api/incidents` | Any | Get incidents |
| POST | `/api/incidents` | Admin | Create incident |
| PATCH | `/api/incidents/<id>/status` | Admin | Update status |
| PATCH | `/api/incidents/<id>/severity` | Admin | Update severity |
| DELETE | `/api/incidents/<id>` | Admin | Delete incident |
| GET | `/api/reports/weekly` | Any | Weekly report data |
| GET | `/api/anomalies` | Admin | Run anomaly detection |

### Query parameters for `GET /api/logs`

```
?ip_address=192.168.1.1
?username=admin
?event_type=login_failed
?severity=high
?start_date=2026-04-01
?end_date=2026-04-10
```

---

## Authentication

The API uses API key authentication via the `X-API-Key` request header.

**Roles:**
- `admin` — read, write, delete, run anomaly detection, export data
- `analyst` — read-only access to all GET endpoints

**Frontend login credentials:**

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | Admin |
| analyst | analyst123 | Analyst |

The frontend login screen handles authentication — after signing in, the session key is automatically attached to every API request. No manual header configuration needed.

---

## Key Design Decisions

**Soft-delete for logs** — Security logs are never hard-deleted. The `DELETE /api/logs/<id>` endpoint sets `is_archived=1` and stamps `archived_at`, preserving the full audit trail. This mirrors real SIEM behaviour where log integrity is critical.

**Role-based access** — A security system with no authentication would be ironic. The `admin` role has full write access; `analyst` is read-only. This is enforced both at the API level (decorators on every route) and in the frontend UI (write actions hidden for analysts).

**Input validation** — All POST/PUT endpoints validate IP address format (IPv4 + IPv6), event types against an allowlist, username format, and date strings before touching the database.

**Foreign key integrity** — The `incidents` table references `logs` via `log_id`, and `logs` references `users` via `username`. Deletions cascade or set null rather than orphaning records.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend language | Python 3.10+ |
| API framework | Flask 3.x |
| Database | MySQL 8.x |
| DB driver | mysql-connector-python |
| Auth | API key + RBAC (custom) |
| Frontend framework | React 18 |
| Build tool | Vite |
| Styling | Inline styles (no CSS framework) |
| HTTP client | Fetch API |

---

## Running Tests

```bash
python -m pytest tests/ -v
```

---

## License

MIT License — free to use for academic and personal projects.

---

*Built as an academic project — ITIRC, 2026*

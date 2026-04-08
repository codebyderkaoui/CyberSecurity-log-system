"""
CyberSecurity Log & Incident Management System
Flask REST API  —  v2 (auth + validation + soft-delete)
--------------------------------------------------------
Run:  python api.py

Auth
----
Every endpoint requires an X-API-Key header.
Set keys via env vars (recommended):
  export ADMIN_API_KEY="your-admin-key"
  export ANALYST_API_KEY="your-analyst-key"
Or edit utils/auth.py directly for development.

Roles:
  admin   → full access (read / write / delete / analyze)
  analyst → read-only (GET endpoints)
"""

import sys
import os
from datetime import datetime, date
from flask import Flask, jsonify, request, g
from flask_cors import CORS

sys.path.append(os.path.dirname(__file__))

from db.connection import get_db_connection
from models.log_model import (
    insert_log, get_all_logs, get_log_by_id,
    update_log, delete_log, search_logs
)
from models.incident_model import (
    create_incident, get_all_incidents, get_incident_by_id,
    update_incident_status, update_incident_severity,
    delete_incident, search_incidents
)
from analysis.reports import generate_weekly_report, get_report_data
from analysis.anomaly_detection import run_all_detections

from utils.auth import require_auth, require_role, require_permission
from utils.validators import validate_log_input, validate_incident_input, validate_date

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)


def serialize(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)


def jsonify_rows(rows):
    if rows is None:
        return []
    return [
        {k: serialize(v) if isinstance(v, (datetime, date)) else v
         for k, v in row.items()}
        for row in rows
    ]


def deep_serialize(obj):
    if isinstance(obj, dict):
        return {k: deep_serialize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [deep_serialize(i) for i in obj]
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return obj


# ---------------------------------------------------------------------------
# Health check  (public — no auth required)
# ---------------------------------------------------------------------------

@app.route("/api/health", methods=["GET"])
def health_check():
    try:
        conn = get_db_connection()
        if conn:
            conn.close()
            return jsonify({"status": "ok", "database": "connected"}), 200
        return jsonify({"status": "error", "database": "unreachable"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# ---------------------------------------------------------------------------
# Logs
# ---------------------------------------------------------------------------

@app.route("/api/logs", methods=["GET"])
@require_auth
def get_logs():
    try:
        ip_address = request.args.get("ip_address")
        username   = request.args.get("username")
        event_type = request.args.get("event_type")
        severity   = request.args.get("severity")
        start_date = request.args.get("start_date")
        end_date   = request.args.get("end_date")

        # Validate date params if provided
        for val, name in [(start_date, "start_date"), (end_date, "end_date")]:
            ok, msg = validate_date(val, name)
            if not ok:
                return jsonify({"success": False, "error": msg}), 400

        has_filter = any([ip_address, username, event_type, severity, start_date, end_date])

        if has_filter:
            logs = search_logs(
                ip_address=ip_address, username=username,
                event_type=event_type, severity=severity,
                start_date=start_date, end_date=end_date,
            )
        else:
            logs = get_all_logs()

        # Filter out soft-deleted entries (is_archived == 1)
        active_logs = [l for l in logs if not l.get("is_archived", 0)]

        return jsonify({"success": True, "count": len(active_logs), "data": jsonify_rows(active_logs)}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs/archived", methods=["GET"])
@require_role("admin")
def get_archived_logs():
    """Admin only — view soft-deleted logs (audit trail)."""
    try:
        logs = get_all_logs()
        archived = [l for l in logs if l.get("is_archived", 0)]
        return jsonify({"success": True, "count": len(archived), "data": jsonify_rows(archived)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs/<int:log_id>", methods=["GET"])
@require_auth
def get_log(log_id):
    try:
        log = get_log_by_id(log_id)
        if not log:
            return jsonify({"success": False, "error": "Log not found"}), 404
        # Hide archived entries from analysts
        if log.get("is_archived") and g.role != "admin":
            return jsonify({"success": False, "error": "Log not found"}), 404
        return jsonify({"success": True, "data": jsonify_rows([log])[0]}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs", methods=["POST"])
@require_permission("write")
def create_log():
    try:
        body = request.get_json(force=True)

        ok, errors = validate_log_input(body)
        if not ok:
            return jsonify({"success": False, "errors": errors}), 400

        log_id = insert_log(
            body["ip_address"].strip(),
            body.get("username"),
            body["event_type"].strip().lower(),
            body.get("message"),
            body.get("severity", "low").lower(),
        )
        if log_id:
            return jsonify({"success": True, "log_id": log_id}), 201
        return jsonify({"success": False, "error": "Failed to insert log"}), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs/<int:log_id>", methods=["PUT"])
@require_permission("write")
def update_log_entry(log_id):
    try:
        body = request.get_json(force=True)
        # Strip protected fields — callers cannot un-archive via PUT
        body.pop("is_archived", None)
        body.pop("archived_at", None)

        result = update_log(log_id, **body)
        if result:
            return jsonify({"success": True, "message": f"Log {log_id} updated"}), 200
        return jsonify({"success": False, "error": "Log not found or update failed"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs/<int:log_id>", methods=["DELETE"])
@require_permission("delete")
def delete_log_entry(log_id):
    """
    Soft-delete: sets is_archived=1 and archived_at=now().
    The row is preserved in the DB for audit purposes.
    Hard-delete is intentionally not exposed via the API.
    """
    try:
        log = get_log_by_id(log_id)
        if not log:
            return jsonify({"success": False, "error": "Log not found"}), 404
        if log.get("is_archived"):
            return jsonify({"success": False, "error": "Log is already archived"}), 409

        result = update_log(
            log_id,
            is_archived=1,
            archived_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        )
        if result:
            return jsonify({"success": True, "message": f"Log {log_id} archived (soft-deleted)"}), 200
        return jsonify({"success": False, "error": "Archive failed"}), 500
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Incidents
# ---------------------------------------------------------------------------

@app.route("/api/incidents", methods=["GET"])
@require_auth
def get_incidents():
    try:
        status        = request.args.get("status")
        severity      = request.args.get("severity")
        title_keyword = request.args.get("title_keyword")
        start_date    = request.args.get("start_date")
        end_date      = request.args.get("end_date")

        for val, name in [(start_date, "start_date"), (end_date, "end_date")]:
            ok, msg = validate_date(val, name)
            if not ok:
                return jsonify({"success": False, "error": msg}), 400

        has_filter = any([status, severity, title_keyword, start_date, end_date])

        incidents = search_incidents(
            status=status, severity=severity,
            title_keyword=title_keyword,
            start_date=start_date, end_date=end_date,
        ) if has_filter else get_all_incidents()

        return jsonify({"success": True, "count": len(incidents), "data": jsonify_rows(incidents)}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/incidents/<int:incident_id>", methods=["GET"])
@require_auth
def get_incident(incident_id):
    try:
        incident = get_incident_by_id(incident_id)
        if not incident:
            return jsonify({"success": False, "error": "Incident not found"}), 404
        return jsonify({"success": True, "data": jsonify_rows([incident])[0]}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/incidents", methods=["POST"])
@require_permission("write")
def create_new_incident():
    try:
        body = request.get_json(force=True)

        ok, errors = validate_incident_input(body)
        if not ok:
            return jsonify({"success": False, "errors": errors}), 400

        incident_id = create_incident(
            body["title"].strip(),
            body.get("description"),
            body.get("severity", "low").lower(),
            body.get("status", "open").lower(),
        )
        if incident_id:
            return jsonify({"success": True, "incident_id": incident_id}), 201
        return jsonify({"success": False, "error": "Failed to create incident"}), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/incidents/<int:incident_id>/status", methods=["PATCH"])
@require_permission("write")
def patch_incident_status(incident_id):
    try:
        body   = request.get_json(force=True)
        status = body.get("status", "").lower()
        valid  = {"open", "investigating", "resolved"}
        if status not in valid:
            return jsonify({"success": False, "error": f"status must be one of {valid}"}), 400

        result = update_incident_status(incident_id, status)
        if result:
            return jsonify({"success": True, "message": f"Incident {incident_id} status → {status}"}), 200
        return jsonify({"success": False, "error": "Incident not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/incidents/<int:incident_id>/severity", methods=["PATCH"])
@require_permission("write")
def patch_incident_severity(incident_id):
    try:
        body     = request.get_json(force=True)
        severity = body.get("severity", "").lower()
        valid    = {"low", "medium", "high", "critical"}
        if severity not in valid:
            return jsonify({"success": False, "error": f"severity must be one of {valid}"}), 400

        result = update_incident_severity(incident_id, severity)
        if result:
            return jsonify({"success": True, "message": f"Incident {incident_id} severity → {severity}"}), 200
        return jsonify({"success": False, "error": "Incident not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/incidents/<int:incident_id>", methods=["DELETE"])
@require_permission("delete")
def delete_incident_entry(incident_id):
    try:
        result = delete_incident(incident_id)
        if result:
            return jsonify({"success": True, "message": f"Incident {incident_id} deleted"}), 200
        return jsonify({"success": False, "error": "Incident not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Reports
# ---------------------------------------------------------------------------

@app.route("/api/reports/weekly", methods=["GET"])
@require_auth
def weekly_report():
    try:
        data = get_report_data()
        if data is None:
            return jsonify({"success": False, "error": "No report data available"}), 404
        return jsonify({"success": True, "data": deep_serialize(data)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------

@app.route("/api/anomalies", methods=["GET"])
@require_permission("analyze")
def anomalies():
    try:
        results = run_all_detections() or []
        if isinstance(results, dict):
            results = [results]
        return jsonify({"success": True, "count": len(results), "data": deep_serialize(results)}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 55)
    print("  CyberSecurity Log System — Flask API  v2")
    print("=" * 55)
    print("  Base URL  : http://localhost:5000")
    print("  Auth      : X-API-Key header required")
    print("  Admin key : ADMIN_API_KEY  env var")
    print("  Analyst   : ANALYST_API_KEY env var")
    print("=" * 55)
    app.run(debug=True, host="0.0.0.0", port=5000)

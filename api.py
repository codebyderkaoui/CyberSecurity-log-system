"""
CyberSecurity Log & Incident Management System
Flask REST API Layer
------------------------------------------------------------
Endpoints:
  Logs:
    GET    /api/logs                  - get all logs (supports query filters)
    POST   /api/logs                  - create a new log
    GET    /api/logs/<id>             - get a single log
    PUT    /api/logs/<id>             - update a log
    DELETE /api/logs/<id>             - delete a log

  Incidents:
    GET    /api/incidents             - get all incidents (supports query filters)
    POST   /api/incidents             - create a new incident
    GET    /api/incidents/<id>        - get a single incident
    PATCH  /api/incidents/<id>/status - update incident status
    PATCH  /api/incidents/<id>/severity - update incident severity
    DELETE /api/incidents/<id>        - delete an incident

  Analysis:
    GET    /api/reports/weekly        - generate weekly report data
    GET    /api/anomalies             - run all anomaly detections

  Utility:
    GET    /api/health                - health check / DB connectivity test
"""

import sys
import os
from datetime import datetime, date
from flask import Flask, jsonify, request
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

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
CORS(app)  # Allow React dev server (localhost:3000) to call this API


def serialize(obj):
    """Make datetime / date objects JSON-serialisable."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    return str(obj)


def jsonify_rows(rows):
    """Convert a list of dicts that may contain datetime objects."""
    if rows is None:
        return []
    return [
        {k: serialize(v) if isinstance(v, (datetime, date)) else v
         for k, v in row.items()}
        for row in rows
    ]


# ---------------------------------------------------------------------------
# Health check
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
def get_logs():
    """
    Fetch logs. Supports optional query-string filters:
      ip_address, username, event_type, severity, start_date, end_date
    """
    try:
        ip_address  = request.args.get("ip_address")
        username    = request.args.get("username")
        event_type  = request.args.get("event_type")
        severity    = request.args.get("severity")
        start_date  = request.args.get("start_date")
        end_date    = request.args.get("end_date")

        # If any filter is provided use search, otherwise return all
        has_filter = any([ip_address, username, event_type, severity, start_date, end_date])

        if has_filter:
            logs = search_logs(
                ip_address=ip_address,
                username=username,
                event_type=event_type,
                severity=severity,
                start_date=start_date,
                end_date=end_date,
            )
        else:
            logs = get_all_logs()

        return jsonify({"success": True, "count": len(logs), "data": jsonify_rows(logs)}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs/<int:log_id>", methods=["GET"])
def get_log(log_id):
    try:
        log = get_log_by_id(log_id)
        if not log:
            return jsonify({"success": False, "error": "Log not found"}), 404
        return jsonify({"success": True, "data": jsonify_rows([log])[0]}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs", methods=["POST"])
def create_log():
    """
    Expected JSON body:
    {
        "ip_address":  "192.168.1.1",   (required)
        "event_type":  "login_failed",  (required)
        "username":    "john",          (optional)
        "message":     "...",           (optional)
        "severity":    "high"           (optional, default "low")
    }
    """
    try:
        body = request.get_json(force=True)

        ip_address = body.get("ip_address")
        event_type = body.get("event_type")

        if not ip_address or not event_type:
            return jsonify({"success": False, "error": "ip_address and event_type are required"}), 400

        username  = body.get("username")
        message   = body.get("message")
        severity  = body.get("severity", "low").lower()

        valid_severities = {"low", "medium", "high"}
        if severity not in valid_severities:
            return jsonify({"success": False, "error": f"severity must be one of {valid_severities}"}), 400

        log_id = insert_log(ip_address, username, event_type, message, severity)
        if log_id:
            return jsonify({"success": True, "log_id": log_id}), 201
        return jsonify({"success": False, "error": "Failed to insert log"}), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs/<int:log_id>", methods=["PUT"])
def update_log_entry(log_id):
    """
    Update any field of an existing log entry.
    Send only the fields you want to change.
    """
    try:
        body = request.get_json(force=True)
        result = update_log(log_id, **body)
        if result:
            return jsonify({"success": True, "message": f"Log {log_id} updated"}), 200
        return jsonify({"success": False, "error": "Log not found or update failed"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs/<int:log_id>", methods=["DELETE"])
def delete_log_entry(log_id):
    try:
        result = delete_log(log_id)
        if result:
            return jsonify({"success": True, "message": f"Log {log_id} deleted"}), 200
        return jsonify({"success": False, "error": "Log not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Incidents
# ---------------------------------------------------------------------------

@app.route("/api/incidents", methods=["GET"])
def get_incidents():
    """
    Fetch incidents. Supports optional query-string filters:
      status, severity, title_keyword, start_date, end_date
    """
    try:
        status        = request.args.get("status")
        severity      = request.args.get("severity")
        title_keyword = request.args.get("title_keyword")
        start_date    = request.args.get("start_date")
        end_date      = request.args.get("end_date")

        has_filter = any([status, severity, title_keyword, start_date, end_date])

        if has_filter:
            incidents = search_incidents(
                status=status,
                severity=severity,
                title_keyword=title_keyword,
                start_date=start_date,
                end_date=end_date,
            )
        else:
            incidents = get_all_incidents()

        return jsonify({"success": True, "count": len(incidents), "data": jsonify_rows(incidents)}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/incidents/<int:incident_id>", methods=["GET"])
def get_incident(incident_id):
    try:
        incident = get_incident_by_id(incident_id)
        if not incident:
            return jsonify({"success": False, "error": "Incident not found"}), 404
        return jsonify({"success": True, "data": jsonify_rows([incident])[0]}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/incidents", methods=["POST"])
def create_new_incident():
    """
    Expected JSON body:
    {
        "title":       "Brute Force Attack",  (required)
        "description": "...",                 (optional)
        "severity":    "critical",            (optional, default "low")
        "status":      "open"                 (optional, default "open")
    }
    """
    try:
        body = request.get_json(force=True)

        title = body.get("title")
        if not title:
            return jsonify({"success": False, "error": "title is required"}), 400

        description = body.get("description")
        severity    = body.get("severity", "low").lower()
        status      = body.get("status", "open").lower()

        valid_severities = {"low", "medium", "high", "critical"}
        valid_statuses   = {"open", "investigating", "resolved"}

        if severity not in valid_severities:
            return jsonify({"success": False, "error": f"severity must be one of {valid_severities}"}), 400
        if status not in valid_statuses:
            return jsonify({"success": False, "error": f"status must be one of {valid_statuses}"}), 400

        incident_id = create_incident(title, description, severity, status)
        if incident_id:
            return jsonify({"success": True, "incident_id": incident_id}), 201
        return jsonify({"success": False, "error": "Failed to create incident"}), 500

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/incidents/<int:incident_id>/status", methods=["PATCH"])
def patch_incident_status(incident_id):
    """
    Body: { "status": "investigating" }
    """
    try:
        body   = request.get_json(force=True)
        status = body.get("status", "").lower()

        valid_statuses = {"open", "investigating", "resolved"}
        if status not in valid_statuses:
            return jsonify({"success": False, "error": f"status must be one of {valid_statuses}"}), 400

        result = update_incident_status(incident_id, status)
        if result:
            return jsonify({"success": True, "message": f"Incident {incident_id} status → {status}"}), 200
        return jsonify({"success": False, "error": "Incident not found"}), 404

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/incidents/<int:incident_id>/severity", methods=["PATCH"])
def patch_incident_severity(incident_id):
    """
    Body: { "severity": "critical" }
    """
    try:
        body     = request.get_json(force=True)
        severity = body.get("severity", "").lower()

        valid_severities = {"low", "medium", "high", "critical"}
        if severity not in valid_severities:
            return jsonify({"success": False, "error": f"severity must be one of {valid_severities}"}), 400

        result = update_incident_severity(incident_id, severity)
        if result:
            return jsonify({"success": True, "message": f"Incident {incident_id} severity → {severity}"}), 200
        return jsonify({"success": False, "error": "Incident not found"}), 404

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/incidents/<int:incident_id>", methods=["DELETE"])
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
def weekly_report():
    """
    Returns the same data that generate_weekly_report() would print,
    but as structured JSON so the React dashboard can render charts.

    If your get_report_data() returns a dict, it is returned directly.
    If it returns None / raises, we fall back gracefully.
    """
    try:
        data = get_report_data()
        if data is None:
            return jsonify({"success": False, "error": "No report data available"}), 404

        # Serialise any datetime objects inside the report dict
        def deep_serialize(obj):
            if isinstance(obj, dict):
                return {k: deep_serialize(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [deep_serialize(i) for i in obj]
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            return obj

        return jsonify({"success": True, "data": deep_serialize(data)}), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Anomaly Detection
# ---------------------------------------------------------------------------

@app.route("/api/anomalies", methods=["GET"])
def anomalies():
    """
    Runs all anomaly detections and returns the results.
    run_all_detections() is expected to return a list of dicts or None.
    """
    try:
        results = run_all_detections()

        if results is None:
            results = []

        # Handle both list and dict return types from run_all_detections
        if isinstance(results, dict):
            results = [results]

        def deep_serialize(obj):
            if isinstance(obj, dict):
                return {k: deep_serialize(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [deep_serialize(i) for i in obj]
            if isinstance(obj, (datetime, date)):
                return obj.isoformat()
            return obj

        return jsonify({
            "success": True,
            "count": len(results),
            "data": deep_serialize(results)
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 55)
    print("  CyberSecurity Log System — Flask API")
    print("=" * 55)
    print("  Base URL : http://localhost:5000")
    print("  Docs     : see endpoint comments in api.py")
    print("=" * 55)
    app.run(debug=True, host="0.0.0.0", port=5000)

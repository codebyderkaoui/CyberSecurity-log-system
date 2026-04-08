"""
utils/validators.py
-------------------
Reusable input validation helpers for the API layer.
"""

import re
from ipaddress import ip_address, AddressValueError


# ---------------------------------------------------------------------------
# IP Address
# ---------------------------------------------------------------------------

def validate_ip(ip: str) -> tuple[bool, str]:
    """
    Validates IPv4 and IPv6 addresses.
    Returns (True, "") on success or (False, error_message) on failure.
    """
    if not ip or not isinstance(ip, str):
        return False, "ip_address is required and must be a string"

    ip = ip.strip()

    try:
        ip_address(ip)   # works for both IPv4 and IPv6
        return True, ""
    except (AddressValueError, ValueError):
        return False, f"'{ip}' is not a valid IPv4 or IPv6 address"


# ---------------------------------------------------------------------------
# Event Type
# ---------------------------------------------------------------------------

VALID_EVENT_TYPES = {
    "login_success",
    "login_failed",
    "access_denied",
    "data_breach",
    "port_scan",
    "brute_force",
    "malware_detected",
    "config_change",
    "privilege_escalation",
    "other",
}

def validate_event_type(event_type: str) -> tuple[bool, str]:
    if not event_type or not isinstance(event_type, str):
        return False, "event_type is required"
    if event_type.strip().lower() not in VALID_EVENT_TYPES:
        return False, f"event_type must be one of: {sorted(VALID_EVENT_TYPES)}"
    return True, ""


# ---------------------------------------------------------------------------
# Severity & Status
# ---------------------------------------------------------------------------

VALID_LOG_SEVERITIES      = {"low", "medium", "high"}
VALID_INCIDENT_SEVERITIES = {"low", "medium", "high", "critical"}
VALID_STATUSES            = {"open", "investigating", "resolved"}


def validate_log_severity(severity: str) -> tuple[bool, str]:
    if severity and severity.lower() not in VALID_LOG_SEVERITIES:
        return False, f"severity must be one of: {sorted(VALID_LOG_SEVERITIES)}"
    return True, ""


def validate_incident_severity(severity: str) -> tuple[bool, str]:
    if severity and severity.lower() not in VALID_INCIDENT_SEVERITIES:
        return False, f"severity must be one of: {sorted(VALID_INCIDENT_SEVERITIES)}"
    return True, ""


def validate_status(status: str) -> tuple[bool, str]:
    if status and status.lower() not in VALID_STATUSES:
        return False, f"status must be one of: {sorted(VALID_STATUSES)}"
    return True, ""


# ---------------------------------------------------------------------------
# Username
# ---------------------------------------------------------------------------

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_\-\.@]{1,64}$")

def validate_username(username: str) -> tuple[bool, str]:
    """Optional field — only validates format if a value is provided."""
    if not username:
        return True, ""   # optional, skip
    if not USERNAME_RE.match(username):
        return False, "username may only contain letters, digits, _ - . @ and be max 64 chars"
    return True, ""


# ---------------------------------------------------------------------------
# Date strings
# ---------------------------------------------------------------------------

DATE_FORMATS = ["%Y-%m-%d", "%Y-%m-%d %H:%M:%S"]

def validate_date(date_str: str, field_name: str = "date") -> tuple[bool, str]:
    """Optional field — validates YYYY-MM-DD or YYYY-MM-DD HH:MM:SS."""
    if not date_str:
        return True, ""
    for fmt in DATE_FORMATS:
        try:
            from datetime import datetime
            datetime.strptime(date_str, fmt)
            return True, ""
        except ValueError:
            continue
    return False, f"{field_name} must be in YYYY-MM-DD or YYYY-MM-DD HH:MM:SS format"


# ---------------------------------------------------------------------------
# Composite validator for a new log entry
# ---------------------------------------------------------------------------

def validate_log_input(body: dict) -> tuple[bool, list[str]]:
    """
    Validates all fields for POST /api/logs.
    Returns (True, []) or (False, [list of error messages]).
    """
    errors = []

    ok, msg = validate_ip(body.get("ip_address", ""))
    if not ok:
        errors.append(msg)

    ok, msg = validate_event_type(body.get("event_type", ""))
    if not ok:
        errors.append(msg)

    ok, msg = validate_username(body.get("username", ""))
    if not ok:
        errors.append(msg)

    ok, msg = validate_log_severity(body.get("severity", "low"))
    if not ok:
        errors.append(msg)

    return (len(errors) == 0), errors


# ---------------------------------------------------------------------------
# Composite validator for a new incident
# ---------------------------------------------------------------------------

def validate_incident_input(body: dict) -> tuple[bool, list[str]]:
    """
    Validates all fields for POST /api/incidents.
    Returns (True, []) or (False, [list of error messages]).
    """
    errors = []

    title = body.get("title", "")
    if not title or not isinstance(title, str) or not title.strip():
        errors.append("title is required and must be a non-empty string")
    elif len(title) > 200:
        errors.append("title must be 200 characters or fewer")

    ok, msg = validate_incident_severity(body.get("severity", "low"))
    if not ok:
        errors.append(msg)

    ok, msg = validate_status(body.get("status", "open"))
    if not ok:
        errors.append(msg)

    return (len(errors) == 0), errors

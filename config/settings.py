"""
Centralized configuration for the Cybersecurity Log Management System.
Modify settings here instead of hardcoding values throughout the application.
"""

import os

# ============================================================
# DATABASE CONFIGURATION
# ============================================================

DATABASE_CONFIG = {
    'host': 'localhost',
    'database': 'cybersec_logs',
    'user': 'root',
    'password': 'your_password',  # Change this to your MySQL password
    'charset': 'utf8mb4',
    'autocommit': False
}

# ============================================================
# ANOMALY DETECTION THRESHOLDS
# ============================================================

ANOMALY_DETECTION = {
    # Brute Force Detection
    'brute_force': {
        'time_window_minutes': 60,      # Look back 60 minutes
        'threshold': 5,                 # 5+ failed attempts = alert
        'high_severity_threshold': 10   # 10+ attempts = high severity
    },
    
    # Account Compromise Detection
    'account_compromise': {
        'time_window_minutes': 30,      # Look back 30 minutes
        'threshold': 3                  # 3+ different usernames = alert
    },
    
    # Login Spike Detection
    'login_spike': {
        'time_window_minutes': 10,      # Look back 10 minutes
        'threshold': 20                 # 20+ logins = spike
    },
    
    # High Severity Event Clustering
    'high_severity': {
        'time_window_hours': 24,        # Look back 24 hours
        'threshold': 3                  # 3+ events = cluster
    },
    
    # Automated incident creation
    'auto_create_incidents': True       # Create incidents automatically
}

# ============================================================
# DATA RETENTION POLICIES
# ============================================================

DATA_RETENTION = {
    'logs_retention_days': 90,          # Delete logs older than 90 days
    'resolved_incidents_days': 180,     # Archive resolved incidents after 180 days
    'enable_auto_cleanup': False        # Auto-cleanup (disabled by default for safety)
}

# ============================================================
# EXPORT CONFIGURATION
# ============================================================

EXPORT_CONFIG = {
    'directory': 'exports',             # Where to save CSV exports
    'include_timestamp': True,          # Add timestamp to filenames
    'date_format': '%Y%m%d_%H%M%S'     # Timestamp format
}

# ============================================================
# SECURITY SETTINGS
# ============================================================

SECURITY_SETTINGS = {
    'max_login_attempts': 5,            # Max attempts before lockout
    'session_timeout_minutes': 30,      # User session timeout
    'require_strong_passwords': True,   # Enforce password complexity
    'min_password_length': 8
}

# ============================================================
# DISPLAY SETTINGS
# ============================================================

DISPLAY_SETTINGS = {
    'logs_per_page': 20,                # Show 20 logs at a time
    'incidents_per_page': 20,           # Show 20 incidents at a time
    'max_search_results': 100,          # Max results for search
    'table_width': 70                   # Console table width
}

# ============================================================
# LOGGING CONFIGURATION
# ============================================================

LOGGING_CONFIG = {
    'enable_logging': True,
    'log_file': 'system.log',
    'log_level': 'INFO',                # DEBUG, INFO, WARNING, ERROR, CRITICAL
    'log_format': '%(asctime)s - %(levelname)s - %(message)s',
    'max_log_size_mb': 10,              # Rotate after 10MB
    'backup_count': 5                   # Keep 5 backup files
}

# ============================================================
# ALERT SETTINGS (for future email alerts)
# ============================================================

ALERT_SETTINGS = {
    'enable_email_alerts': False,
    'smtp_server': 'smtp.gmail.com',
    'smtp_port': 587,
    'sender_email': '',
    'sender_password': '',
    'alert_recipients': [],
    'alert_on_critical': True,
    'alert_on_high': False
}

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_database_config():
    """Get database configuration dictionary"""
    return DATABASE_CONFIG.copy()


def get_anomaly_thresholds():
    """Get anomaly detection thresholds"""
    return ANOMALY_DETECTION.copy()


def get_retention_policy():
    """Get data retention policy"""
    return DATA_RETENTION.copy()


def get_export_directory():
    """Get export directory path"""
    export_dir = EXPORT_CONFIG['directory']
    if export_dir != ".":
        os.makedirs(export_dir, exist_ok=True)
    return export_dir

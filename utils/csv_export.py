import sys
import os
import csv
from datetime import datetime

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from models.log_model import get_all_logs, search_logs
from models.incident_model import get_all_incidents, search_incidents
from config.settings import EXPORT_CONFIG


EXPORT_DIR = EXPORT_CONFIG['directory']

def ensure_export_directory():
    """Create export directory if it doesn't exist"""
    if EXPORT_DIR != ".":
        os.makedirs(EXPORT_DIR, exist_ok=True)


def get_export_path(filename):
    """Get full path for export file"""
    ensure_export_directory()
    return os.path.join(EXPORT_DIR, filename)


def export_logs_to_csv(logs=None, filename=None):
    """
    Export logs to CSV file.
    
    Args:
        logs: List of log dictionaries (if None, exports all logs)
        filename: Custom filename (if None, auto-generates with timestamp)
    
    Returns:
        Boolean indicating success
    """
    
    # Get all logs if not provided
    if logs is None:
        print("Fetching all logs from database...")
        logs = get_all_logs()
    
    if not logs:
        print("No logs to export")
        return False
    
    # Generate filename with timestamp if not provided
    if filename is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"logs_export_{timestamp}.csv"
    
    filepath = get_export_path(filename)
    
    try:
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            # Define CSV headers
            fieldnames = ['log_id', 'event_time', 'username', 'ip_address', 
                         'event_type', 'severity', 'message', 'created_at']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            # Write header row
            writer.writeheader()
            
            # Write data rows
            for log in logs:
                # Convert datetime objects to strings
                row = {
                    'log_id': log.get('log_id', ''),
                    'event_time': str(log.get('event_time', '')),
                    'username': log.get('username', '') or 'N/A',
                    'ip_address': log.get('ip_address', ''),
                    'event_type': log.get('event_type', ''),
                    'severity': log.get('severity', ''),
                    'message': log.get('message', ''),
                    'created_at': str(log.get('created_at', ''))
                }
                writer.writerow(row)
        
        print(f"Exported {len(logs)} logs to: {filepath}")
        return True
    
    except Exception as e:
        print(f"Error exporting logs to CSV: {e}")
        return False


def export_incidents_to_csv(incidents=None, filename=None):
    """
    Export incidents to CSV file.
    
    Args:
        incidents: List of incident dictionaries (if None, exports all incidents)
        filename: Custom filename (if None, auto-generates with timestamp)
    
    Returns:
        Boolean indicating success
    """
    
    # Get all incidents if not provided
    if incidents is None:
        print("Fetching all incidents from database...")
        incidents = get_all_incidents()
    
    if not incidents:
        print("No incidents to export")
        return False
    
    # Generate filename with timestamp if not provided
    if filename is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"incidents_export_{timestamp}.csv"

    filepath = get_export_path(filename)
    
    try:
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            # Define CSV headers
            fieldnames = ['incident_id', 'log_id', 'title', 'description', 
                         'status', 'severity', 'reporter', 'created_at', 'updated_at']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            # Write header row
            writer.writeheader()
            
            # Write data rows
            for incident in incidents:
                # Convert datetime objects to strings
                row = {
                    'incident_id': incident.get('incident_id', ''),
                    'log_id': incident.get('log_id', '') or 'N/A',
                    'title': incident.get('title', ''),
                    'description': incident.get('description', ''),
                    'status': incident.get('status', ''),
                    'severity': incident.get('severity', ''),
                    'reporter': incident.get('reporter', ''),
                    'created_at': str(incident.get('created_at', '')),
                    'updated_at': str(incident.get('updated_at', ''))
                }
                writer.writerow(row)
        
        print(f"Exported {len(incidents)} incidents to: {filepath}")
        return True
    
    except Exception as e:
        print(f"Error exporting incidents to CSV: {e}")
        return False


def export_filtered_logs_to_csv(ip_address=None, username=None, event_type=None, 
                                severity=None, start_date=None, end_date=None):
    """
    Export filtered logs to CSV.
    
    Args:
        Filter parameters (same as search_logs)
    
    Returns:
        Boolean indicating success
    """
    
    print("Searching logs with filters...")
    logs = search_logs(
        ip_address=ip_address,
        username=username,
        event_type=event_type,
        severity=severity,
        start_date=start_date,
        end_date=end_date
    )
    
    if not logs:
        print("No logs found matching filters")
        return False
    
    # Generate descriptive filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filters = []
    if ip_address: filters.append(f"ip_{ip_address}")
    if username: filters.append(f"user_{username}")
    if event_type: filters.append(f"type_{event_type}")
    
    filter_str = "_".join(filters[:2]) if filters else "filtered"
    filename = f"logs_{filter_str}_{timestamp}.csv"
    
    return export_logs_to_csv(logs, filename)


def export_filtered_incidents_to_csv(status=None, severity=None, title_keyword=None,
                                     start_date=None, end_date=None):
    """
    Export filtered incidents to CSV.
    
    Args:
        Filter parameters (same as search_incidents)
    
    Returns:
        Boolean indicating success
    """
    
    print("Searching incidents with filters...")
    incidents = search_incidents(
        status=status,
        severity=severity,
        title_keyword=title_keyword,
        start_date=start_date,
        end_date=end_date
    )
    
    if not incidents:
        print("No incidents found matching filters")
        return False
    
    # Generate descriptive filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filters = []
    if status: filters.append(f"status_{status}")
    if severity: filters.append(f"severity_{severity}")
    
    filter_str = "_".join(filters[:2]) if filters else "filtered"
    filename = f"incidents_{filter_str}_{timestamp}.csv"
    
    return export_incidents_to_csv(incidents, filename)


if __name__ == "__main__":
    """Test the export functions"""
    print("\n" + "="*70)
    print("CSV EXPORT TEST")
    print("="*70)
    
    print("\n1. Testing logs export...")
    export_logs_to_csv()
    
    print("\n2. Testing incidents export...")
    export_incidents_to_csv()
    
    print("\n" + "="*70)
    print("Export test complete.")
    print("="*70 + "\n")
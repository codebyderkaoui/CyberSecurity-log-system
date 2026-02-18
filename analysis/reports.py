import sys
import os
import csv
from datetime import datetime
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from db.connection import get_db_connection

# Default: Creates 'exports' folder in project root
EXPORT_DIR = "exports"  # Creates 'exports' folder in project root

# Alternative options (uncomment one to use):

# Option 1: Desktop folder (Windows)
# EXPORT_DIR = "C:/Users/epics/Desktop/CyberSec_Exports"

# Option 2: Project root (no subfolder)
# EXPORT_DIR = "."

# Option 3: Different subfolder name
# EXPORT_DIR = "reports"
# EXPORT_DIR = "csv_files"
# EXPORT_DIR = "data_exports"


def ensure_export_directory():
    """Create export directory if it doesn't exist"""
    if EXPORT_DIR != ".":
        os.makedirs(EXPORT_DIR, exist_ok=True)

def get_export_path(filename):
    """Get full path for export file"""
    ensure_export_directory()
    return os.path.join(EXPORT_DIR, filename)

def generate_weekly_report():
    print("Generating report...")

    conn = get_db_connection()
    if not conn:
        print("Error connecting to database")
        return
    
    try:
        cursor = conn.cursor()
        cursor.callproc('weekly_summary')

        results = []
        for result in cursor.stored_results():
            results =result.fetchall()
        
        if not results:
            print("No logs found")
            return
        
        print("\n" + "="*70)
        print("WEEKLY SECURITY LOG SUMMARY")
        print("="*70)
        print(f"{'Date':<12} {'Total Logs':<12} {'Failed Logins':<15} {'Incidents':<12}")
        print("-"*70)

        for row in results:
            date = str(row[0])
            total_logs = row[1]
            failed_logins = row[2] or 0
            incidents = row[3] or 0
            print(f"{date:<12} {total_logs:<12} {failed_logins:<15} {incidents:<12}")
        print("="*70 + "\n")

    except Exception as e:
        print(f"Error generating report: {e}")
    finally:
        cursor.close()
        conn.close()


def export_report_to_csv(results, filename=None):
    """Export weekly report to CSV file"""
    
    # Generate filename with timestamp if not provided
    if filename is None:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"weekly_report_{timestamp}.csv"

    filepath = get_export_path(filename)
    
    try:
        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write header
            writer.writerow(['Date', 'Total_Logs', 'Failed_Logins', 'Incidents'])
            
            # Write data rows
            for row in results:
                date = str(row[0])
                total_logs = row[1]
                failed_logins = row[2] or 0
                incidents = row[3] or 0
                writer.writerow([date, total_logs, failed_logins, incidents])
        
        print(f"Report exported to: {filepath}")
        return True
    
    except Exception as e:
        print(f"Error exporting to CSV: {e}")
        return False


def get_report_data():
    """Get report data without printing (for use in other modules)"""
    conn = get_db_connection()
    if not conn:
        return None
    
    try:
        cursor = conn.cursor()
        cursor.callproc('weekly_summary')

        results = []
        for result in cursor.stored_results():
            results = result.fetchall()
        
        return results
    
    except Exception as e:
        print(f"Error getting report data: {e}")
        return None
    
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    generate_weekly_report()
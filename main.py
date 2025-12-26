import sys
import os
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(__file__))

from db.connection import get_db_connection
from models.log_model import insert_log, get_all_logs, get_log_by_id, update_log, delete_log, search_logs
from models.incident_model import create_incident, get_all_incidents, get_incident_by_id, update_incident_status, update_incident_severity, delete_incident, search_incidents
from analysis.reports import generate_weekly_report


def clear_screen():
    """Clear terminal screen"""
    os.system('cls' if os.name == 'nt' else 'clear')


def print_header():
    """Print application header"""
    print("\n" + "="*60)
    print(" CYBERSECURITY LOG & INCIDENT MANAGEMENT SYSTEM")
    print("="*60)


def print_menu():
    """Display main menu"""
    print("\n📋 MAIN MENU:")
    print("  1. Add New Log Entry")
    print("  2. View All Logs")
    print("  3. Search/Filter Logs")
    print("  4. View All Incidents")
    print("  5. Search/Filter Incidents")
    print("  6. Update Incident Status")
    print("  7. Generate Weekly Report")
    print("  8. Run Anomaly Detection (Coming Soon)")
    print("  0. Exit")
    print("-"*60)


def add_log_entry():
    """Add a new log entry"""
    print("\n" + "="*60)
    print("ADD NEW LOG ENTRY")
    print("="*60)
    
    try:
        print("\nEvent Types: login_success, login_failed, access_denied, data_breach")
        event_type = input("Enter event type: ").strip()
        
        if not event_type:
            print("❌ Error: Event type cannot be empty")
            return
        
        ip_address = input("Enter IP address: ").strip()
        username = input("Enter username (optional): ").strip() or None
        message = input("Enter message/details (optional): ").strip() or None
        
        print("\nSeverity levels: low, medium, high")
        severity = input("Enter severity (default: low): ").strip().lower() or 'low'
        
        # Validate severity
        if severity not in ['low', 'medium', 'high']:
            print("⚠️  Invalid severity. Using 'low' as default.")
            severity = 'low'
        
        # Add log using model
        result = insert_log(ip_address, username, event_type, message, severity)
        
        if result:
            print(f"\n✅ Log entry added successfully! (Log ID: {result})")
        else:
            print("\n❌ Failed to add log entry")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    input("\nPress Enter to continue...")


def view_all_logs():
    """Display all logs"""
    print("\n" + "="*60)
    print("ALL LOG ENTRIES")
    print("="*60)
    
    try:
        logs = get_all_logs()
        
        if not logs:
            print("\nNo logs found in database.")
            input("\nPress Enter to continue...")
            return
        
        print(f"\nTotal logs: {len(logs)}\n")
        print(f"{'ID':<5} {'Event Type':<15} {'IP Address':<16} {'Username':<12} {'Severity':<10}")
        print("-"*80)
        
        for log in logs[:20]:  # Show last 20 logs
            log_id = log.get('log_id', 'N/A')
            event_type = log.get('event_type', 'N/A')
            ip_address = log.get('ip_address', 'N/A')
            username = log.get('username') or 'N/A'
            severity = log.get('severity', 'N/A')
            
            print(f"{log_id:<5} {event_type:<15} {ip_address:<16} {username:<12} {severity:<10}")
        
        if len(logs) > 20:
            print(f"\n... and {len(logs) - 20} more logs")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    input("\nPress Enter to continue...")


def search_filter_logs():
    """Search and filter logs with multiple criteria"""
    print("\n" + "="*60)
    print("SEARCH/FILTER LOGS")
    print("="*60)
    print("\nLeave blank to skip a filter\n")
    
    try:
        # Get filter criteria from user
        ip_address = input("Filter by IP address: ").strip() or None
        username = input("Filter by username: ").strip() or None
        
        print("\nEvent types: login_success, login_failed, access_denied, data_breach")
        event_type = input("Filter by event type: ").strip() or None
        
        print("\nSeverity levels: low, medium, high")
        severity = input("Filter by severity: ").strip().lower() or None
        if severity and severity not in ['low', 'medium', 'high']:
            print("⚠️  Invalid severity, ignoring filter")
            severity = None
        
        print("\nDate format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD")
        start_date = input("Filter by start date (from): ").strip() or None
        end_date = input("Filter by end date (to): ").strip() or None
        
        # Search logs
        print("\nSearching...")
        logs = search_logs(
            ip_address=ip_address,
            username=username,
            event_type=event_type,
            severity=severity,
            start_date=start_date,
            end_date=end_date
        )
        
        if not logs:
            print("\n❌ No logs found matching your criteria.")
            input("\nPress Enter to continue...")
            return
        
        # Display results
        print(f"\n✅ Found {len(logs)} matching logs\n")
        print(f"{'ID':<5} {'Event Type':<15} {'IP Address':<16} {'Username':<12} {'Severity':<10} {'Time':<20}")
        print("-"*90)
        
        for log in logs[:50]:  # Show up to 50 results
            log_id = log.get('log_id', 'N/A')
            event_type = log.get('event_type', 'N/A')
            ip_address = log.get('ip_address', 'N/A')
            username = log.get('username') or 'N/A'
            severity = log.get('severity', 'N/A')
            event_time = str(log.get('event_time', 'N/A'))[:19]
            
            print(f"{log_id:<5} {event_type:<15} {ip_address:<16} {username:<12} {severity:<10} {event_time:<20}")
        
        if len(logs) > 50:
            print(f"\n... and {len(logs) - 50} more logs (showing first 50)")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    input("\nPress Enter to continue...")


def view_all_incidents():
    """Display all incidents"""
    print("\n" + "="*60)
    print("ALL INCIDENTS")
    print("="*60)
    
    try:
        incidents = get_all_incidents()
        
        if not incidents:
            print("\nNo incidents found in database.")
            input("\nPress Enter to continue...")
            return
        
        print(f"\nTotal incidents: {len(incidents)}\n")
        print(f"{'ID':<5} {'Title':<25} {'Severity':<10} {'Status':<12} {'Created':<20}")
        print("-"*90)
        
        for incident in incidents:
            inc_id = incident.get('incident_id', 'N/A')
            title = incident.get('title', 'N/A')
            title = (title[:22] + '...') if len(title) > 25 else title
            severity = incident.get('severity', 'N/A')
            status = incident.get('status', 'N/A')
            created_at = incident.get('created_at', 'N/A')
            
            print(f"{inc_id:<5} {title:<25} {severity:<10} {status:<12} {str(created_at):<20}")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    input("\nPress Enter to continue...")


def search_filter_incidents():
    """Search and filter incidents with multiple criteria"""
    print("\n" + "="*60)
    print("SEARCH/FILTER INCIDENTS")
    print("="*60)
    print("\nLeave blank to skip a filter\n")
    
    try:
        # Get filter criteria from user
        print("Status options: open, investigating, resolved")
        status = input("Filter by status: ").strip().lower() or None
        if status and status not in ['open', 'investigating', 'resolved']:
            print("⚠️  Invalid status, ignoring filter")
            status = None
        
        print("\nSeverity levels: low, medium, high, critical")
        severity = input("Filter by severity: ").strip().lower() or None
        if severity and severity not in ['low', 'medium', 'high', 'critical']:
            print("⚠️  Invalid severity, ignoring filter")
            severity = None
        
        title_keyword = input("\nSearch in title/description: ").strip() or None
        
        print("\nDate format: YYYY-MM-DD HH:MM:SS or YYYY-MM-DD")
        start_date = input("Filter by start date (from): ").strip() or None
        end_date = input("Filter by end date (to): ").strip() or None
        
        # Search incidents
        print("\nSearching...")
        incidents = search_incidents(
            status=status,
            severity=severity,
            title_keyword=title_keyword,
            start_date=start_date,
            end_date=end_date
        )
        
        if not incidents:
            print("\n❌ No incidents found matching your criteria.")
            input("\nPress Enter to continue...")
            return
        
        # Display results
        print(f"\n✅ Found {len(incidents)} matching incidents\n")
        print(f"{'ID':<5} {'Title':<30} {'Severity':<10} {'Status':<12} {'Created':<20}")
        print("-"*90)
        
        for incident in incidents:
            inc_id = incident.get('incident_id', 'N/A')
            title = incident.get('title', 'N/A')
            title = (title[:27] + '...') if len(title) > 30 else title
            severity = incident.get('severity', 'N/A')
            status = incident.get('status', 'N/A')
            created_at = str(incident.get('created_at', 'N/A'))[:19]
            
            print(f"{inc_id:<5} {title:<30} {severity:<10} {status:<12} {created_at:<20}")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    input("\nPress Enter to continue...")


def update_incident():
    """Update incident status"""
    print("\n" + "="*60)
    print("UPDATE INCIDENT STATUS")
    print("="*60)
    
    try:
        # First show all incidents
        incidents = get_all_incidents()
        
        if not incidents:
            print("\nNo incidents found in database.")
            input("\nPress Enter to continue...")
            return
        
        print(f"\n{'ID':<5} {'Title':<30} {'Severity':<10} {'Status':<12}")
        print("-"*70)
        
        for incident in incidents:
            inc_id = incident.get('incident_id', 'N/A')
            title = incident.get('title', 'N/A')
            title = (title[:27] + '...') if len(title) > 30 else title
            severity = incident.get('severity', 'N/A')
            status = incident.get('status', 'N/A')
            
            print(f"{inc_id:<5} {title:<30} {severity:<10} {status:<12}")
        
        print("\n")
        incident_id = input("Enter incident ID to update: ").strip()
        
        if not incident_id.isdigit():
            print("❌ Error: Invalid incident ID")
            input("\nPress Enter to continue...")
            return
        
        print("\nStatus options: open, investigating, resolved")
        new_status = input("Enter new status: ").strip().lower()
        
        if new_status not in ['open', 'investigating', 'resolved']:
            print("❌ Error: Invalid status")
            input("\nPress Enter to continue...")
            return
        
        result = update_incident_status(int(incident_id), new_status)
        
        if result:
            print(f"\n✅ Incident #{incident_id} updated to '{new_status}'")
        else:
            print(f"\n❌ Failed to update incident #{incident_id}")
    
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    input("\nPress Enter to continue...")


def generate_report():
    """Generate weekly summary report"""
    print("\n")
    try:
        generate_weekly_report()
    except Exception as e:
        print(f"❌ Error generating report: {e}")
    
    input("\nPress Enter to continue...")


def run_anomaly_detection():
    """Placeholder for anomaly detection"""
    print("\n" + "="*60)
    print("ANOMALY DETECTION")
    print("="*60)
    print("\n⚠️  This feature is under development (Week 6)")
    print("Coming soon: Detection of repeated failed logins and suspicious patterns")
    input("\nPress Enter to continue...")


def main():
    """Main application loop"""
    
    # Test database connection
    print("Testing database connection...")
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database. Please check your configuration.")
        print("Make sure MySQL is running and db/config.py is properly configured.")
        sys.exit(1)
    conn.close()
    print("✅ Database connection successful!\n")
    
    while True:
        clear_screen()
        print_header()
        print_menu()
        
        choice = input("Enter your choice: ").strip()
        
        if choice == '1':
            clear_screen()
            add_log_entry()
        
        elif choice == '2':
            clear_screen()
            view_all_logs()
        
        elif choice == '3':
            clear_screen()
            search_filter_logs()
        
        elif choice == '4':
            clear_screen()
            view_all_incidents()
        
        elif choice == '5':
            clear_screen()
            search_filter_incidents()
        
        elif choice == '6':
            clear_screen()
            update_incident()
        
        elif choice == '7':
            clear_screen()
            generate_report()
        
        elif choice == '8':
            clear_screen()
            run_anomaly_detection()
        
        elif choice == '0':
            print("\n👋 Exiting system. Goodbye!")
            sys.exit(0)
        
        else:
            print("\n❌ Invalid choice. Please try again.")
            input("\nPress Enter to continue...")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n👋 System interrupted. Goodbye!")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
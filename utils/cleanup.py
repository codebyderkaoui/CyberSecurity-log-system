import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.connection import get_db_connection
from config.settings import DATABASE_RETENTION


def delete_old_logs(days_old=None):
    """
    Delete logs older than specified days.
    
    Args:
        days_old: Number of days to keep (default: 90)
    
    Returns:
        Number of logs deleted
    """
    if not days_old:
        days_old = DATABASE_RETENTION['logs_retention_days']

    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database")
        return 0
    
    cursor = conn.cursor()
    
    try:
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        # Count logs to be deleted
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM logs 
            WHERE created_at < %s
        """, (cutoff_date,))
        
        count = cursor.fetchone()[0]
        
        if count == 0:
            print(f"No logs older than {days_old} days found")
            return 0
        
        # Confirm deletion
        print(f"\nFound {count} logs older than {days_old} days")
        print(f"   Cutoff date: {cutoff_date.strftime('%Y-%m-%d')}")
        
        confirm = input(f"   Delete these {count} logs? (y/n): ").strip().lower()
        
        if confirm != 'y':
            print("Deletion cancelled")
            return 0
        
        # Delete old logs
        cursor.execute("""
            DELETE FROM logs 
            WHERE created_at < %s
        """, (cutoff_date,))
        
        conn.commit()
        print(f"✅ Deleted {count} old logs")
        return count
    
    except Exception as e:
        print(f"Error deleting old logs: {e}")
        conn.rollback()
        return 0
    
    finally:
        cursor.close()
        conn.close()


def archive_resolved_incidents(days_old=None):
    """
    Delete resolved incidents older than specified days.
    
    Args:
        days_old: Number of days to keep resolved incidents (default: 180)
    
    Returns:
        Number of incidents deleted
    """
    if not days_old:
        days_old = DATABASE_RETENTION['resolved_incidents_days']

    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database")
        return 0
    
    cursor = conn.cursor()
    
    try:
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=days_old)
        
        # Count incidents to be archived
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM incidents 
            WHERE status = 'resolved'
                AND updated_at < %s
        """, (cutoff_date,))
        
        count = cursor.fetchone()[0]
        
        if count == 0:
            print(f"No resolved incidents older than {days_old} days found")
            return 0
        
        # Confirm deletion
        print(f"\nFound {count} resolved incidents older than {days_old} days")
        print(f"   Cutoff date: {cutoff_date.strftime('%Y-%m-%d')}")
        
        confirm = input(f"   Archive (delete) these {count} incidents? (y/n): ").strip().lower()
        
        if confirm != 'y':
            print("Archive cancelled")
            return 0
        
        # Delete old resolved incidents
        cursor.execute("""
            DELETE FROM incidents 
            WHERE status = 'resolved'
                AND updated_at < %s
        """, (cutoff_date,))
        
        conn.commit()
        print(f"Archived {count} resolved incidents")
        return count
    
    except Exception as e:
        print(f"Error archiving incidents: {e}")
        conn.rollback()
        return 0
    
    finally:
        cursor.close()
        conn.close()


def cleanup_test_data():
    """
    Remove test/demo data for clean production environment.
    
    Returns:
        Dictionary with counts of deleted items
    """
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database")
        return {'logs': 0, 'incidents': 0, 'users': 0}
    
    cursor = conn.cursor()
    results = {'logs': 0, 'incidents': 0, 'users': 0}
    
    try:
        print("\nThis will delete ALL test/demo data:")
        print("   - Logs with test IPs (1.2.3.x, 192.168.99.x)")
        print("   - Incidents from anomaly_detection_system")
        print("   - Test users (test_user_x)")
        
        confirm = input("\n   Proceed with cleanup? (y/n): ").strip().lower()
        
        if confirm != 'y':
            print("Cleanup cancelled")
            return results
        
        # Delete test logs
        cursor.execute("""
            DELETE FROM logs 
            WHERE ip_address LIKE '1.2.3.%' 
                OR ip_address LIKE '192.168.99.%'
                OR username LIKE 'test_user_%'
        """)
        results['logs'] = cursor.rowcount
        
        # Delete test incidents
        cursor.execute("""
            DELETE FROM incidents 
            WHERE reporter = 'anomaly_detection_system'
                OR title LIKE '%Test%'
        """)
        results['incidents'] = cursor.rowcount
        
        # Delete test users
        cursor.execute("""
            DELETE FROM users 
            WHERE username LIKE 'test_user_%'
        """)
        results['users'] = cursor.rowcount
        
        conn.commit()
        
        print(f"\nCleanup complete:")
        print(f"   - Deleted {results['logs']} test logs")
        print(f"   - Deleted {results['incidents']} test incidents")
        print(f"   - Deleted {results['users']} test users")
        
        return results
    
    except Exception as e:
        print(f"Error during cleanup: {e}")
        conn.rollback()
        return results
    
    finally:
        cursor.close()
        conn.close()


def get_database_size():
    """
    Get current database storage statistics.
    
    Returns:
        Dictionary with counts and sizes
    """
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database")
        return None
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        stats = {}
        
        # Count logs
        cursor.execute("SELECT COUNT(*) as count FROM logs")
        stats['total_logs'] = cursor.fetchone()['count']
        
        # Count incidents
        cursor.execute("SELECT COUNT(*) as count FROM incidents")
        stats['total_incidents'] = cursor.fetchone()['count']
        
        # Count by incident status
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM incidents 
            GROUP BY status
        """)
        stats['incidents_by_status'] = cursor.fetchall()
        
        # Oldest log
        cursor.execute("""
            SELECT MIN(created_at) as oldest 
            FROM logs
        """)
        result = cursor.fetchone()
        stats['oldest_log'] = result['oldest'] if result['oldest'] else None
        
        # Newest log
        cursor.execute("""
            SELECT MAX(created_at) as newest 
            FROM logs
        """)
        result = cursor.fetchone()
        stats['newest_log'] = result['newest'] if result['newest'] else None
        
        return stats
    
    except Exception as e:
        print(f"Error getting database stats: {e}")
        return None
    
    finally:
        cursor.close()
        conn.close()


def display_cleanup_menu():
    """Interactive cleanup menu"""
    print("\n" + "="*70)
    print("DATABASE MAINTENANCE & CLEANUP")
    print("="*70)
    
    # Show current database stats
    stats = get_database_size()
    
    if stats:
        print(f"\nCurrent Database Status:")
        print(f"   Total Logs: {stats['total_logs']}")
        print(f"   Total Incidents: {stats['total_incidents']}")
        
        if stats['incidents_by_status']:
            print(f"\n   Incidents by Status:")
            for item in stats['incidents_by_status']:
                print(f"      - {item['status']}: {item['count']}")
        
        if stats['oldest_log']:
            print(f"\n   Oldest Log: {stats['oldest_log']}")
        if stats['newest_log']:
            print(f"   Newest Log: {stats['newest_log']}")
    
    print("\n" + "="*70)
    print("Cleanup Options:")
    print("  1. Delete old logs (90+ days)")
    print("  2. Archive resolved incidents (180+ days)")
    print("  3. Remove all test/demo data")
    print("  4. Custom: Delete logs older than X days")
    print("  5. View database statistics only")
    print("  0. Back to main menu")
    print("-"*70)
    
    choice = input("\nEnter your choice: ").strip()
    
    if choice == '1':
        delete_old_logs(90)
    
    elif choice == '2':
        archive_resolved_incidents(180)
    
    elif choice == '3':
        cleanup_test_data()
    
    elif choice == '4':
        try:
            days = int(input("Delete logs older than how many days? "))
            if days > 0:
                delete_old_logs(days)
            else:
                print("Invalid number of days")
        except ValueError:
            print("Please enter a valid number")
    
    elif choice == '5':
        print("\nStatistics displayed above")
    
    elif choice == '0':
        return
    
    else:
        print("Invalid choice")
    
    input("\nPress Enter to continue...")


if __name__ == "__main__":
    """Run cleanup menu when executed directly"""
    display_cleanup_menu()
import sys
import os
from datetime import datetime, timedelta

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.connection import get_db_connection


def get_dashboard_stats():
    """
    Get comprehensive dashboard statistics.
    
    Returns:
        Dictionary with all dashboard metrics
    """
    conn = get_db_connection()
    if not conn:
        return None
    
    cursor = conn.cursor(dictionary=True)
    stats = {}
    
    try:
        # === LOG STATISTICS ===
        
        # Total logs (all time)
        cursor.execute("SELECT COUNT(*) as count FROM logs")
        stats['total_logs_all_time'] = cursor.fetchone()['count']
        
        # Logs in last 24 hours
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM logs 
            WHERE event_time > NOW() - INTERVAL 24 HOUR
        """)
        stats['logs_last_24h'] = cursor.fetchone()['count']
        
        # Logs in last 7 days
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM logs 
            WHERE event_time > NOW() - INTERVAL 7 DAY
        """)
        stats['logs_last_7d'] = cursor.fetchone()['count']
        
        # === INCIDENT STATISTICS ===
        
        # Total incidents
        cursor.execute("SELECT COUNT(*) as count FROM incidents")
        stats['total_incidents'] = cursor.fetchone()['count']
        
        # Incidents by status
        cursor.execute("""
            SELECT status, COUNT(*) as count 
            FROM incidents 
            GROUP BY status
        """)
        stats['incidents_by_status'] = {row['status']: row['count'] for row in cursor.fetchall()}
        
        # Incidents by severity
        cursor.execute("""
            SELECT severity, COUNT(*) as count 
            FROM incidents 
            GROUP BY severity 
            ORDER BY FIELD(severity, 'critical', 'high', 'medium', 'low')
        """)
        stats['incidents_by_severity'] = {row['severity']: row['count'] for row in cursor.fetchall()}
        
        # === FAILED LOGIN STATISTICS ===
        
        # Total failed logins
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM logs 
            WHERE event_type = 'login_failed'
        """)
        stats['total_failed_logins'] = cursor.fetchone()['count']
        
        # Failed logins last 24h
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM logs 
            WHERE event_type = 'login_failed'
                AND event_time > NOW() - INTERVAL 24 HOUR
        """)
        stats['failed_logins_24h'] = cursor.fetchone()['count']
        
        # Failed login rate
        if stats['total_logs_all_time'] > 0:
            stats['failed_login_rate'] = (stats['total_failed_logins'] / stats['total_logs_all_time']) * 100
        else:
            stats['failed_login_rate'] = 0
        
        return stats
    
    except Exception as e:
        print(f"Error getting dashboard stats: {e}")
        return None
    
    finally:
        cursor.close()
        conn.close()


def get_top_attacked_ips(limit=5):
    """
    Get IPs with most failed login attempts.
    
    Args:
        limit: Number of IPs to return (default: 5)
    
    Returns:
        List of dictionaries with IP and attempt count
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT 
                ip_address,
                COUNT(*) as failed_attempts,
                MAX(event_time) as last_attempt
            FROM logs
            WHERE event_type = 'login_failed'
            GROUP BY ip_address
            ORDER BY failed_attempts DESC
            LIMIT %s
        """, (limit,))
        
        return cursor.fetchall()
    
    except Exception as e:
        print(f"Error getting top attacked IPs: {e}")
        return []
    
    finally:
        cursor.close()
        conn.close()


def get_top_targeted_users(limit=5):
    """
    Get usernames with most failed login attempts.
    
    Args:
        limit: Number of users to return (default: 5)
    
    Returns:
        List of dictionaries with username and attempt count
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT 
                username,
                COUNT(*) as failed_attempts,
                MAX(event_time) as last_attempt
            FROM logs
            WHERE event_type = 'login_failed'
                AND username IS NOT NULL
            GROUP BY username
            ORDER BY failed_attempts DESC
            LIMIT %s
        """, (limit,))
        
        return cursor.fetchall()
    
    except Exception as e:
        print(f"Error getting top targeted users: {e}")
        return []
    
    finally:
        cursor.close()
        conn.close()


def get_event_type_distribution():
    """
    Get distribution of event types.
    
    Returns:
        List of dictionaries with event type and count
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT 
                event_type,
                COUNT(*) as count,
                (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM logs)) as percentage
            FROM logs
            GROUP BY event_type
            ORDER BY count DESC
        """)
        
        return cursor.fetchall()
    
    except Exception as e:
        print(f"Error getting event distribution: {e}")
        return []
    
    finally:
        cursor.close()
        conn.close()


def get_hourly_activity(hours=24):
    """
    Get log activity for the last N hours.
    
    Args:
        hours: Number of hours to analyze (default: 24)
    
    Returns:
        List of dictionaries with hour and log count
    """
    conn = get_db_connection()
    if not conn:
        return []
    
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("""
            SELECT 
                DATE_FORMAT(event_time, '%%Y-%%m-%%d %%H:00:00') as hour,
                COUNT(*) as count
            FROM logs
            WHERE event_time > NOW() - INTERVAL %s HOUR
            GROUP BY hour
            ORDER BY hour DESC
        """, (hours,))
        
        return cursor.fetchall()
    
    except Exception as e:
        print(f"Error getting hourly activity: {e}")
        return []
    
    finally:
        cursor.close()
        conn.close()


def get_threat_summary():
    """
    Get overall threat landscape summary.
    
    Returns:
        Dictionary with threat metrics
    """
    conn = get_db_connection()
    if not conn:
        return None
    
    cursor = conn.cursor(dictionary=True)
    threat_summary = {}
    
    try:
        # High severity events in last 24h
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM logs 
            WHERE severity = 'high'
                AND event_time > NOW() - INTERVAL 24 HOUR
        """)
        threat_summary['high_severity_24h'] = cursor.fetchone()['count']
        
        # Critical incidents
        cursor.execute("""
            SELECT COUNT(*) as count 
            FROM incidents 
            WHERE severity = 'critical'
                AND status != 'resolved'
        """)
        threat_summary['critical_incidents_open'] = cursor.fetchone()['count']
        
        # Unique attacking IPs in last 7 days
        cursor.execute("""
            SELECT COUNT(DISTINCT ip_address) as count 
            FROM logs 
            WHERE event_type = 'login_failed'
                AND event_time > NOW() - INTERVAL 7 DAY
        """)
        threat_summary['unique_attacking_ips'] = cursor.fetchone()['count']
        
        # Average incident resolution time (in hours)
        cursor.execute("""
            SELECT AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours
            FROM incidents
            WHERE status = 'resolved'
                AND updated_at > created_at
        """)
        result = cursor.fetchone()
        threat_summary['avg_resolution_hours'] = round(result['avg_hours'], 1) if result['avg_hours'] else 0
        
        return threat_summary
    
    except Exception as e:
        print(f"Error getting threat summary: {e}")
        return None
    
    finally:
        cursor.close()
        conn.close()


def display_dashboard():
    """Display comprehensive security dashboard"""
    print("\n" + "="*70)
    print("SECURITY DASHBOARD")
    print("="*70)
    
    # Get all stats
    stats = get_dashboard_stats()
    threat = get_threat_summary()
    
    if not stats:
        print("Unable to load dashboard statistics")
        return
    
    # === OVERVIEW SECTION ===
    print("\nOVERVIEW")
    print("-"*70)
    print(f"Total Logs (All Time):     {stats['total_logs_all_time']:,}")
    print(f"Logs (Last 24 Hours):      {stats['logs_last_24h']:,}")
    print(f"Logs (Last 7 Days):        {stats['logs_last_7d']:,}")
    print(f"Total Incidents:           {stats['total_incidents']:,}")
    print(f"Failed Login Rate:         {stats['failed_login_rate']:.2f}%")
    
    # === INCIDENTS BREAKDOWN ===
    print("\nINCIDENTS BY STATUS")
    print("-"*70)
    for status, count in stats['incidents_by_status'].items():
        status_emoji = {"open": "🔴", "investigating": "🟡", "resolved": "🟢"}.get(status, "⚪")
        print(f"{status_emoji} {status.capitalize():<15} {count:>3}")
    
    print("\nINCIDENTS BY SEVERITY")
    print("-"*70)
    for severity, count in stats['incidents_by_severity'].items():
        severity_emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(severity, "⚪")
        print(f"{severity_emoji} {severity.capitalize():<15} {count:>3}")
    
    # === THREAT LANDSCAPE ===
    if threat:
        print("\nTHREAT LANDSCAPE (Last 24 Hours)")
        print("-"*70)
        print(f"High Severity Events:      {threat['high_severity_24h']}")
        print(f"Critical Open Incidents:   {threat['critical_incidents_open']}")
        print(f"Unique Attacking IPs:      {threat['unique_attacking_ips']}")
        print(f"Avg Resolution Time:       {threat['avg_resolution_hours']} hours")
    
    # === TOP ATTACKED IPs ===
    print("\nTOP 5 ATTACKING IPs")
    print("-"*70)
    top_ips = get_top_attacked_ips(5)
    if top_ips:
        print(f"{'IP Address':<16} {'Failed Attempts':<16} {'Last Attempt':<20}")
        print("-"*70)
        for ip in top_ips:
            print(f"{ip['ip_address']:<16} {ip['failed_attempts']:<16} {str(ip['last_attempt']):<20}")
    else:
        print("No failed login attempts recorded")
    
    # === TOP TARGETED USERS ===
    print("\nTOP 5 TARGETED ACCOUNTS")
    print("-"*70)
    top_users = get_top_targeted_users(5)
    if top_users:
        print(f"{'Username':<16} {'Failed Attempts':<16} {'Last Attempt':<20}")
        print("-"*70)
        for user in top_users:
            print(f"{user['username']:<16} {user['failed_attempts']:<16} {str(user['last_attempt']):<20}")
    else:
        print("No targeted accounts identified")
    
    # === EVENT DISTRIBUTION ===
    print("\nEVENT TYPE DISTRIBUTION")
    print("-"*70)
    event_dist = get_event_type_distribution()
    if event_dist:
        print(f"{'Event Type':<20} {'Count':<10} {'Percentage':<10}")
        print("-"*70)
        for event in event_dist:
            print(f"{event['event_type']:<20} {event['count']:<10} {event['percentage']:.1f}%")
    else:
        print("No event data available")
    
    print("\n" + "="*70)


def display_statistics_menu():
    """Interactive statistics menu"""
    while True:
        print("\n" + "="*70)
        print("SECURITY ANALYTICS & STATISTICS")
        print("="*70)
        print("\nStatistics Options:")
        print("  1. View Security Dashboard")
        print("  2. View Top Attacked IPs")
        print("  3. View Top Targeted Accounts")
        print("  4. View Event Type Distribution")
        print("  5. View Hourly Activity (Last 24h)")
        print("  6. View Threat Summary")
        print("  0. Back to Main Menu")
        print("-"*70)
        
        choice = input("\nEnter your choice: ").strip()
        
        if choice == '1':
            display_dashboard()
            input("\nPress Enter to continue...")
        
        elif choice == '2':
            print("\nTOP ATTACKING IPs")
            print("-"*70)
            top_ips = get_top_attacked_ips(10)
            if top_ips:
                print(f"{'Rank':<6} {'IP Address':<16} {'Failed Attempts':<16} {'Last Attempt':<20}")
                print("-"*70)
                for i, ip in enumerate(top_ips, 1):
                    print(f"{i:<6} {ip['ip_address']:<16} {ip['failed_attempts']:<16} {str(ip['last_attempt']):<20}")
            else:
                print("No data available")
            input("\nPress Enter to continue...")
        
        elif choice == '3':
            print("\nTOP TARGETED ACCOUNTS")
            print("-"*70)
            top_users = get_top_targeted_users(10)
            if top_users:
                print(f"{'Rank':<6} {'Username':<16} {'Failed Attempts':<16} {'Last Attempt':<20}")
                print("-"*70)
                for i, user in enumerate(top_users, 1):
                    print(f"{i:<6} {user['username']:<16} {user['failed_attempts']:<16} {str(user['last_attempt']):<20}")
            else:
                print("No data available")
            input("\nPress Enter to continue...")
        
        elif choice == '4':
            print("\nEVENT TYPE DISTRIBUTION")
            print("-"*70)
            event_dist = get_event_type_distribution()
            if event_dist:
                print(f"{'Event Type':<25} {'Count':<10} {'Percentage':<10}")
                print("-"*70)
                for event in event_dist:
                    bar_length = int(event['percentage'] / 2)
                    bar = "█" * bar_length
                    print(f"{event['event_type']:<25} {event['count']:<10} {event['percentage']:>5.1f}% {bar}")
            else:
                print("No data available")
            input("\nPress Enter to continue...")
        
        elif choice == '5':
            print("\nHOURLY ACTIVITY (Last 24 Hours)")
            print("-"*70)
            hourly = get_hourly_activity(24)
            if hourly:
                print(f"{'Hour':<20} {'Log Count':<10}")
                print("-"*70)
                for hour in hourly[:15]:  # Show last 15 hours
                    print(f"{str(hour['hour']):<20} {hour['count']:<10}")
            else:
                print("No data available")
            input("\nPress Enter to continue...")
        
        elif choice == '6':
            threat = get_threat_summary()
            if threat:
                print("\nTHREAT SUMMARY")
                print("-"*70)
                print(f"High Severity Events (24h):     {threat['high_severity_24h']}")
                print(f"Critical Open Incidents:        {threat['critical_incidents_open']}")
                print(f"Unique Attacking IPs (7 days):  {threat['unique_attacking_ips']}")
                print(f"Avg Incident Resolution:        {threat['avg_resolution_hours']} hours")
                print("-"*70)
            else:
                print("Unable to load threat summary")
            input("\nPress Enter to continue...")
        
        elif choice == '0':
            break
        
        else:
            print("Invalid choice")
            input("\nPress Enter to continue...")


if __name__ == "__main__":
    """Run statistics menu when executed directly"""
    display_statistics_menu()
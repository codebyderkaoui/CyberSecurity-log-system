import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from db.connection import get_db_connection
from models.incident_model import create_incident

def detect_brute_force_attacks(time_window_min=60, threshold=5):
    conn = get_db_connection()
    if not conn:
        return []
    cursor = conn.cursor(dictionary=True)
    anomalies = []

    try:
        cursor.execute("""
            select 
                ip_address,
                count(*) as failed_attempts,
                min(event_time) as first_attempt,
                max(event_time) as last_attempt,
                group_concat(distinct username) as targets
            from logs
            where event_type = 'login_failed'
                and event_time > now() - interval %s minute
            group by ip_address
            having failed_attempts >= %s
            order by failed_attempts desc
        """, (time_window_min, threshold))
        results = cursor.fetchall()
        for row in results:
            anomaly = {
                "type": "brute_force_attack",
                "ip_address": row["ip_address"],
                "failed_attempts": row["failed_attempts"],
                "first_attempt": row["first_attempt"],
                "last_attempt": row["last_attempt"],
                "targets": row["targets"],
                "severity": "high" if row["failed_attempts"] >= 10 else "medium"
            }
            anomalies.append(anomaly)
        return anomalies

    except Exception as e:
        print(f"Error detecting brute force attacks: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def detect_account_compromise_attempts(time_window_min=30, threshold=3):
    conn = get_db_connection()
    if not conn:
        return []
    cursor = conn.cursor(dictionary=True)
    anomalies = []

    try:
        cursor.execute("""
            select 
                ip_address,
                count(distinct username) as unique_users,
                count(*) as total_attempts,
                min(event_time) as first_attempt,
                max(event_time) as last_attempt
            from logs
            where event_type = 'login_failed'
                and username is not null
                and event_time > now() - interval %s minute
            group by ip_address
            having unique_users >= %s
            order by unique_users desc
        """, (time_window_min, threshold))
        results = cursor.fetchall()
        for row in results:
            anomaly = {
                "type": "account_compromise_attempt",
                "ip_address": row["ip_address"],
                "unique_users": row["unique_users"],
                "total_attempts": row["total_attempts"],
                "first_attempt": row["first_attempt"],
                "last_attempt": row["last_attempt"],
                "severity": "high"
            }
            anomalies.append(anomaly)
        return anomalies

    except Exception as e:
        print(f"Error detecting account compromise attempts: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def detect_login_spikes(time_window_min=10, threshold=20):
    conn = get_db_connection()
    if not conn:
        return []
    cursor = conn.cursor(dictionary=True)
    anomalies = []

    try:
        cursor.execute("""
            select 
                count(*) as login_count,
                min(event_time) as window_start,
                max(event_time) as window_end
            from logs
            where event_type in ('login_success', 'login_failed')
                and event_time > now() - interval %s minute
        """, (time_window_min,))
        result = cursor.fetchone()
        if result and result["login_count"] >= threshold:
            anomaly = {
                "type": "login_spikes",
                "login_count": result["login_count"],
                "window_start": result["window_start"],
                "window_end": result["window_end"],
                "time_window_min": time_window_min,
                "severity": "medium"
            }
            anomalies.append(anomaly)
        return anomalies

    except Exception as e:
        print(f"Error detecting login spikes: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def detect_high_severity_events(time_window_hours=24):
    conn = get_db_connection()
    if not conn:
        return []
    cursor = conn.cursor(dictionary=True)
    anomalies = []

    try:
        cursor.execute("""
            select 
                event_type,
                count(*) as event_count,
                min(event_time) as first_occurrence,
                max(event_time) as last_occurrence
            from logs
            where severity = 'high'
                and event_time > now() - interval %s hour
            group by event_type
            having event_count >= 3
            order by event_count desc
        """, (time_window_hours,))
        results = cursor.fetchall()
        for row in results:
            anomaly = {
                "type": "high_severity_cluster",
                "event_type": row["event_type"],
                "event_count": row["event_count"],
                "first_occurrence": row["first_occurrence"],
                "last_occurrence": row["last_occurrence"],
                "severity": "high"
            }
            anomalies.append(anomaly)
        return anomalies

    except Exception as e:
        print(f"Error detecting high severity events: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def create_incidents_from_anomalies(anomalies, auto_create=True):
    if not auto_create:
        return 0
    incidents_created = 0

    for anomaly in anomalies:
        title = ""
        description = ""
        severity = anomaly.get("severity", "medium")

        if anomaly["type"] == "brute_force_attack":
            title = f"Brute Force Attack from {anomaly['ip_address']}"
            description = f"IP {anomaly['ip_address']} made {anomaly['failed_attempts']} failed login attempts. Targets: {anomaly['targets']}. Period: {anomaly['first_attempt']} to {anomaly['last_attempt']}."
        elif anomaly["type"] == "account_compromise_attempt":
            title = f"Account Compromise Attempt from {anomaly['ip_address']}"
            description = f"IP {anomaly['ip_address']} attempted to access {anomaly['unique_users']} unique accounts. Total attempts: {anomaly['total_attempts']}. Period: {anomaly['first_attempt']} to {anomaly['last_attempt']}."
        elif anomaly["type"] == "login_spikes":
            title = f"Unexpected Login Activity Spike detected"
            description = f"{anomaly['login_count']} login events detected in the last {anomaly['time_window_min']} minutes. "
            description += f"This is so much higher than normal."
        elif anomaly["type"] == "high_severity_cluster":
            title = f"Multiple High Severity {anomaly['event_type']} Events"
            description = f"{anomaly['event_count']} high severity {anomaly['event_type']} events detected. first occurrence: {anomaly['first_occurrence']}, last occurrence: {anomaly['last_occurrence']}."

        incident_id = create_incident(title=title, description=description, severity=severity, reporter="anomaly_detection_system")
        if incident_id:
            incidents_created += 1

    return incidents_created

def run_all_detections(auto_create_incidents=True):
    print("\nrunning anomaly detection...")
    all_anomalies = []

    print("\ndetecting brute force attacks...")
    brute_force = detect_brute_force_attacks(time_window_min=60, threshold=5)
    all_anomalies.extend(brute_force)
    print(f"found {len(brute_force)} brute force attacks.")
    
    print("\ndetecting account compromise attempts...")
    account_compromise = detect_account_compromise_attempts(time_window_min=30, threshold=3)
    all_anomalies.extend(account_compromise)
    print(f"found {len(account_compromise)} account compromise attempts.")
    
    print("\ndetecting login spikes...")
    login_spikes = detect_login_spikes(time_window_min=10, threshold=20)
    all_anomalies.extend(login_spikes)
    print(f"found {len(login_spikes)} unexpected login spikes.")
    
    print("\ndetecting high severity events...")
    high_severity = detect_high_severity_events(time_window_hours=24)
    all_anomalies.extend(high_severity)
    print(f"found {len(high_severity)} high severity clusters.")

    print("\n" + "="*70)
    print("total anomalies detected:", len(all_anomalies))
    print("="*70)

    if all_anomalies:
        print("\nAnomalies Details:")
        for i, anomaly in enumerate(all_anomalies, 1):
            print(f"\n{i}. {anomaly['type'].upper().replace('_', ' ')}")
            print(f"   Severity: {anomaly['severity'].upper()}")
            
            if anomaly['type'] == 'brute_force_attack':
                print(f"   IP: {anomaly['ip_address']}")
                print(f"   Failed Attempts: {anomaly['failed_attempts']}")
                print(f"   Targets: {anomaly['targets']}")
            
            elif anomaly['type'] == 'account_compromise_attempt':
                print(f"   IP: {anomaly['ip_address']}")
                print(f"   Unique Users: {anomaly['unique_users']}")
                print(f"   Total Attempts: {anomaly['total_attempts']}")
            
            elif anomaly['type'] == 'login_spikes':
                print(f"   Login Count: {anomaly['login_count']} in {anomaly['time_window_min']} minutes")
            
            elif anomaly['type'] == 'high_severity_cluster':
                print(f"   Event Type: {anomaly['event_type']}")
                print(f"   Event Count: {anomaly['event_count']}")
        
        if auto_create_incidents:
            print("\n" + "-"*70)
            print("creating incidents...")
            incidents_created = create_incidents_from_anomalies(all_anomalies, auto_create=True)
            print(f"created {incidents_created} new incidents.")
    else:
        print("\nNo anomalies detected.")
    
    print("\n" + "="*70)
    
    return {
        "anomalies": all_anomalies,
        "total_count": len(all_anomalies),
        "brute_force_count": len(brute_force),
        "account_compromise_count": len(account_compromise),
        "login_spike_count": len(login_spikes),
        "high_severity_count": len(high_severity)
    }

if __name__ == "__main__":
    run_all_detections(auto_create_incidents=True)
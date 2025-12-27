import sys
import os
import time
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from db.connection import get_db_connection
from models.log_model import insert_log, delete_log
from models.incident_model import get_all_incidents, delete_incident
from analysis.anomaly_detection import detect_brute_force_attacks, detect_account_compromise_attempts, detect_login_spikes, run_all_detections

def cleanup_test_data():
    """Clean up test data"""
    conn = get_db_connection()
    if not conn:
        return
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM logs WHERE ip_address LIKE '1.2.3.%'")
        cursor.execute("DELETE FROM logs WHERE username LIKE 'test_user_%'")
        cursor.execute("DELETE FROM incidents WHERE reporter = 'anomaly_detection_system'")
        cursor.execute("DELETE FROM users WHERE username LIKE 'test_user_%'")
        conn.commit()
    except Exception as e:
        print(f" Error during cleanup: {e}")
    finally:
        cursor.close()
        conn.close()

def create_test_users():
    """Create test users for tests"""
    conn = get_db_connection()
    if not conn:
        return False
    cursor = conn.cursor()
    try:
        for i in range(1, 5):
            cursor.execute("""
                INSERT IGNORE INTO users (username, password_hash, role)
                VALUES (%s, 'test_hash', 'analyst')
            """, (f"test_user_{i}",))
        conn.commit()
        return True
    except Exception as e:
        print(f" Error creating test users: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def run_anomaly_tests():
    print("\nRunning anomaly detection tests...")
    
    # Cleanup before tests
    cleanup_test_data()
    
    # Create test users for account compromise test
    if not create_test_users():
        print(" Error creating test users.")
        return False
    
    # Test 1: Brute force detection
    print("Testing brute force detection...")
    test_ip = "1.2.3.100"
    for i in range(7):
        insert_log(test_ip, None, "login_failed", f"Test attempt {i+1}", "medium")
        time.sleep(0.1)
    
    anomalies = detect_brute_force_attacks(time_window_min=60, threshold=5)
    found = False
    for anomaly in anomalies:
        if anomaly['ip_address'] == test_ip:
            found = True
            break
    
    if found:
        print(" Success detecting brute force.")
    else:
        print(" Error detecting brute force.")
        cleanup_test_data()
        return False
    
    # Test 2: Account compromise detection
    print("Testing account compromise detection...")
    test_ip2 = "1.2.3.200"
    test_users = ["test_user_1", "test_user_2", "test_user_3", "test_user_4"]
    for username in test_users:
        insert_log(test_ip2, username, "login_failed", "Test compromise", "medium")
        time.sleep(0.1)
    
    anomalies = detect_account_compromise_attempts(time_window_min=30, threshold=3)
    found = False
    for anomaly in anomalies:
        if anomaly['ip_address'] == test_ip2:
            found = True
            break
    
    if found:
        print(" Success detecting account compromise.")
    else:
        print(" Error detecting account compromise.")
        cleanup_test_data()
        return False
    
    # Test 3: Login spike detection
    print("Testing login spike detection...")
    for i in range(25):
        event_type = "login_success" if i % 2 == 0 else "login_failed"
        insert_log(f"1.2.3.{i+10}", None, event_type, f"Spike test {i}", "low")
        time.sleep(0.05)
    
    anomalies = detect_login_spikes(time_window_min=10, threshold=20)
    if anomalies and len(anomalies) > 0:
        print(" Success detecting login spike.")
    else:
        print(" Error detecting login spike.")
        cleanup_test_data()
        return False
    
    # Test 4: Incident creation from anomalies
    print("Testing incident creation...")
    incidents_before = get_all_incidents()
    count_before = len(incidents_before)
    
    test_ip3 = "1.2.3.250"
    for i in range(6):
        insert_log(test_ip3, None, "login_failed", f"Incident test {i+1}", "medium")
        time.sleep(0.1)
    
    run_all_detections(auto_create_incidents=True)
    
    incidents_after = get_all_incidents()
    count_after = len(incidents_after)
    
    if count_after > count_before:
        print(" Success creating incidents from anomalies.")
    else:
        print(" Error creating incidents from anomalies.")
        cleanup_test_data()
        return False
    
    # Cleanup after tests
    cleanup_test_data()
    
    print("All anomaly detection tests passed.")
    return True

if __name__ == "__main__":
    run_anomaly_tests()
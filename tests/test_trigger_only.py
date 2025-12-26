import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import time
from db.connection import get_db_connection
from models.incident_model import get_all_incidents, delete_incident
from models.log_model import insert_log, delete_log

def run_trigger_test():
    print("Running automatic trigger test...")
    attacker_ip = "192.168.55.55"
    print(f"Simulating attack from: {attacker_ip}")
    print("Targeting the 3 failure threshold of the trigger...")
    for i in range(3):
        insert_log(attacker_ip, None, "login_failed", "Bad Password", "medium")
        print(f"  Inserted failed login #{i+1}")
        time.sleep(0.5)
    
    print("Waiting for 5 seconds...")
    time.sleep(5)

    print("Checking if any incidents were created...")
    incidents = get_all_incidents()
    
    if incidents:
        latest_incident = incidents[0]

        if latest_incident["title"] == "Multiple login failures detected" and attacker_ip in latest_incident["description"]:
            print("  Automatic trigger test passed!")
            print("    Cleaning up the test incident data...")
            delete_incident(latest_incident['incident_id'])
            delete_log(latest_incident['log_id'])
            print("    -> Incident deleted. Trigger remains active.")
            return True
        else:
            print(" Automatic trigger test failed.")
    else:
        print(" Automatic trigger test failed.")

    return False

if __name__ == "__main__":    
    run_trigger_test()
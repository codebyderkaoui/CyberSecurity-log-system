from db.connection import get_db_connection
from models.incident_model import create_incident, get_all_incidents, get_incident_by_id, update_incident_status, update_incident_severity, delete_incident
from models.log_model import insert_log, get_all_logs, get_log_by_id, update_log, delete_log

def run_manual_tests():
    print("\nRunning manual tests...")

    print("Creating incident...")
    new_incident_id = create_incident("Manual Test Incident", "This is a CRUD test", "low")
    if not new_incident_id:
        print(" Error creating incident.")
        return False
    else:
        print(" Success creating incident.")
    
    print("Getting all incidents...")
    all_incidents = get_all_incidents()
    if not all_incidents:
        print(" Error getting all incidents.")
        return False
    else:
        print(" Success getting all incidents.")
    
    print("Getting incident by id...")
    incident = get_incident_by_id(new_incident_id)
    if incident and incident["title"] == "Manual Test Incident":
        print(" Success getting incident by id.")
    else:
        print(" Error getting incident by id.")
        return False
    
    print("Updating status...")
    update_incident_status(new_incident_id, "resolved")
    incident = get_incident_by_id(new_incident_id)
    if incident and incident["status"] == "resolved":
        print(" Success updating status.")
    else:
        print(" Error updating status.")
        return False
    
    print("Updating severity...")
    update_incident_severity(new_incident_id, "high")
    incident = get_incident_by_id(new_incident_id)
    if incident and incident["severity"] == "high":
        print(" Success updating severity.")
    else:
        print(" Error updating severity.")
        return False
    
    print("Deleting incident...")
    delete_incident(new_incident_id)
    incident = get_incident_by_id(new_incident_id)
    if not incident:
        print(" Success deleting incident.")
    else:
        print(" Error deleting incident.")
        return False
    
    print("Creating log...")
    new_log_id = insert_log("1.2.3.4", None, "login", "User logged in", "low")
    if not new_log_id:
        print(" Error creating log.")
        return False
    else:
        print(" Success creating log.")
    
    print("Getting all logs...")
    all_logs = get_all_logs()
    if not all_logs:
        print(" Error getting all logs.")
        return False
    else:
        print(" Success getting all logs.")
    
    print("Getting log by id...")
    log = get_log_by_id(new_log_id)
    if log and log["ip_address"] == "1.2.3.4":
        print(" Success getting log by id.")
    else:
        print(" Error getting log by id.")
        return False
    
    print("Updating log...")
    update_log(new_log_id, "User logged out")
    log = get_log_by_id(new_log_id)
    if log and log["message"] == "User logged out":
        print(" Success updating log.")
    else:
        print(" Error updating log.")
        return False
    
    print("Deleting log...")
    delete_log(new_log_id)
    log = get_log_by_id(new_log_id)
    if not log:
        print(" Success deleting log.")
    else:
        print(" Error deleting log.")
        return False
    
    print("All manual tests passed.")
    return True

if __name__ == "__main__":
    run_manual_tests()
    
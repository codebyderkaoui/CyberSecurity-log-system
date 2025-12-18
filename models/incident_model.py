from db.connection import get_db_connection

def create_incident(title, description=None, severity=None, log_id=None, reporter=None):
    conn = get_db_connection()
    if not conn:
        return False
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO incidents (title, description, severity, log_id, reporter)
            VALUES (%s, %s, %s, %s, %s)
            """, (title, description, severity, log_id, reporter))
        conn.commit()
        new_incident_id = cursor.lastrowid
        return new_incident_id
    except Exception as e:
        print(f"Error creating incident: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def get_all_incidents():
    conn = get_db_connection()
    if not conn: return []
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM incidents ORDER BY created_at DESC")
        incidents = cursor.fetchall()
        return incidents
    except Exception as e:
        print(f"Error getting incidents: {e}")
        return []
    finally:            
        cursor.close()  
        conn.close()

def get_incident_by_id(incident_id):    
    conn = get_db_connection()
    if not conn: return None
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM incidents WHERE incident_id = %s",
                       (incident_id,))
        incident = cursor.fetchone()
        return incident
    except Exception as e:
        print(f"Error getting incident: {e}")
        return None
    finally:
        cursor.close()
        conn.close() 


def update_incident_status(incident_id, new_status):
    conn = get_db_connection()
    if not conn: return False
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE incidents SET status = %s WHERE incident_id = %s",
            (new_status, incident_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating incident: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def update_incident_severity(incident_id, new_severity):
    conn = get_db_connection()
    if not conn: return False
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE incidents SET severity = %s WHERE incident_id = %s",
            (new_severity, incident_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating incident: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def delete_incident(incident_id):
    conn = get_db_connection()
    if not conn: return False
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM incidents WHERE incident_id = %s",
            (incident_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error deleting incident: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

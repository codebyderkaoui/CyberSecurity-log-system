import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from db.connection import get_db_connection

def insert_log(ip_address, username, event_type, message, severity='low'):
    conn = get_db_connection()
    if not conn: return False
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO logs (event_time, ip_address, username, event_type, message, severity)
            VALUES (NOW(), %s, %s, %s, %s, %s)
            """, (ip_address, username, event_type, message, severity))
        conn.commit()
        new_log_id = cursor.lastrowid
        return new_log_id
    except Exception as e:
        print(f"Error inserting log: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def get_all_logs():
    conn = get_db_connection()
    if not conn: return []
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM logs ORDER BY created_at DESC")
        logs = cursor.fetchall()
        return logs
    except Exception as e:
        print(f"Error getting logs: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def get_log_by_id(log_id):
    conn = get_db_connection()
    if not conn: return []
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM logs WHERE log_id = %s", (log_id,))
        log = cursor.fetchone()
        return log
    except Exception as e:
        print(f"Error getting log: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def search_logs(ip_address=None, username=None, event_type=None, severity=None, start_date=None, end_date=None):
    conn = get_db_connection()
    if not conn: return []
    cursor = conn.cursor(dictionary=True)
    try:
        query = "select * from logs where 1=1"
        params= []

        if ip_address:
            query += " AND ip_address = %s"
            params.append(ip_address)
        if username:
            query += " AND username = %s"
            params.append(username)
        if event_type:
            query += " AND event_type = %s"
            params.append(event_type)
        if severity:
            query += " AND severity = %s"
            params.append(severity)
        if start_date:
            query += " AND event_time >= %s"
            params.append(start_date)
        if end_date:
            query += " AND event_time <= %s"
            params.append(end_date)
        query += " ORDER BY event_time DESC"

        cursor.execute(query, params)
        logs = cursor.fetchall()
        return logs
    except Exception as e:
        print(f"Error searching logs: {e}")
        return []
    finally:
        cursor.close()
        conn.close()

def update_log(log_id, message):
    conn = get_db_connection()
    if not conn: return False
    cursor = conn.cursor()
    try:
        cursor.execute("""
        UPDATE logs SET message = %s WHERE log_id = %s""",
        (message, log_id))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating log: {e}")
        return False
    finally:
        cursor.close()
        conn.close()

def delete_log(log_id):
    conn = get_db_connection()
    if not conn: return False
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM logs WHERE log_id = %s", (log_id,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error deleting log: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
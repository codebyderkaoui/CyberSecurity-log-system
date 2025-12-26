import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from db.connection import get_db_connection

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

if __name__ == "__main__":
    generate_weekly_report()   
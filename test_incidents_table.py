
from db.connection import get_db_connection

def test_connection():
    conn = get_db_connection()
    if conn:
        print("Connection successful!")
        conn.close()
    else:
        print("Connection failed!")

def test_insert_select():
    conn = get_db_connection()
    if not conn:
        print("Cannot run queries, connection failed.")
        return

    cursor = conn.cursor()

    try:
        cursor.execute(
            "INSERT INTO incidents (title, description) VALUES (%s, %s)",
            ("Test Incident", "This is a test row")
        )
        conn.commit()
        print("Insert successful!")

        cursor.execute("SELECT * FROM incidents WHERE title=%s", ("Test Incident",))
        result = cursor.fetchall()
        print("Select query result:", result)

    except Exception as e:
        print("Error during test:", e)

    finally:
        cursor.execute("DELETE FROM incidents WHERE title=%s", ("Test Incident",))
        conn.commit()
        cursor.close()
        conn.close()
        print("Test cleanup done.")

if __name__ == "__main__":
    test_connection()
    test_insert_select()

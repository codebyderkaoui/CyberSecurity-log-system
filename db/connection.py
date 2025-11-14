from db.config import host, user, password, database
import mysql.connector
from mysql.connector import Error

def get_db_connection():

    try:
        connection = mysql.connector.connect(
            host=host,
            user=user",
            password=password,
            database=database
        )
        if connection.is_connected():
            return connection
        
    except Error as e:
        print(f"Error connecting to database: {e}")
        return None
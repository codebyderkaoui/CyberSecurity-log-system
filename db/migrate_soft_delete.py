"""
db/migrate_soft_delete.py
--------------------------
One-time migration: adds `is_archived` (soft-delete) column to the logs table.

Run once:
    python db/migrate_soft_delete.py

Safe to run multiple times — it checks if the column already exists first.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from db.connection import get_db_connection


def run_migration():
    conn = get_db_connection()
    if not conn:
        print("❌ Could not connect to database.")
        sys.exit(1)

    cursor = conn.cursor()

    try:
        # ----------------------------------------------------------------
        # 1. Add is_archived to logs (if not already present)
        # ----------------------------------------------------------------
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'logs'
              AND COLUMN_NAME  = 'is_archived'
        """)
        exists = cursor.fetchone()[0]

        if exists:
            print("✅ 'is_archived' column already exists on logs — skipping.")
        else:
            cursor.execute("""
                ALTER TABLE logs
                ADD COLUMN is_archived TINYINT(1) NOT NULL DEFAULT 0
                    COMMENT '0 = active, 1 = soft-deleted (audit trail preserved)'
            """)
            print("✅ Added 'is_archived' column to logs.")

        # ----------------------------------------------------------------
        # 2. Add archived_at timestamp (optional — useful for auditing)
        # ----------------------------------------------------------------
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'logs'
              AND COLUMN_NAME  = 'archived_at'
        """)
        exists = cursor.fetchone()[0]

        if exists:
            print("✅ 'archived_at' column already exists on logs — skipping.")
        else:
            cursor.execute("""
                ALTER TABLE logs
                ADD COLUMN archived_at DATETIME NULL DEFAULT NULL
                    COMMENT 'Timestamp of when the log was soft-deleted'
            """)
            print("✅ Added 'archived_at' column to logs.")

        # ----------------------------------------------------------------
        # 3. Add an index so filtering active logs stays fast
        # ----------------------------------------------------------------
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME   = 'logs'
              AND INDEX_NAME   = 'idx_logs_is_archived'
        """)
        idx_exists = cursor.fetchone()[0]

        if idx_exists:
            print("✅ Index 'idx_logs_is_archived' already exists — skipping.")
        else:
            cursor.execute("""
                CREATE INDEX idx_logs_is_archived ON logs (is_archived)
            """)
            print("✅ Created index on logs.is_archived.")

        conn.commit()
        print("\n🎉 Migration complete.")

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    run_migration()

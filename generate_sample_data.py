import sys
import os
from datetime import datetime, timedelta
import random
import time

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '.')))

from db.connection import get_db_connection
from models.log_model import insert_log
from models.incident_model import create_incident

# Sample data for realistic demo
USERNAMES = [
    'admin', 'root', 'john.doe', 'jane.smith', 'bob.wilson', 
    'alice.brown', 'charlie.davis', 'david.miller', 'emma.johnson', 
    'frank.garcia', 'grace.martinez', 'henry.rodriguez', None
]

IP_ADDRESSES = [
    '192.168.1.10', '192.168.1.20', '192.168.1.30', '192.168.1.40',
    '10.0.0.5', '10.0.0.15', '10.0.0.25',
    '172.16.0.10', '172.16.0.20',
    '203.0.113.5',  # External IP
    '198.51.100.10',  # Suspicious external IP
    '203.0.113.100'  # Attack IP
]

EVENT_TYPES = {
    'login_success': 0.60,  # 60% of events
    'login_failed': 0.25,   # 25% - will trigger some incidents
    'access_denied': 0.10,  # 10%
    'data_breach': 0.03,    # 3% - high severity
    'unauthorized_access': 0.02  # 2% - high severity
}

SEVERITIES = {
    'login_success': 'low',
    'login_failed': 'medium',
    'access_denied': 'medium',
    'data_breach': 'high',
    'unauthorized_access': 'high'
}

MESSAGES = {
    'login_success': [
        'User logged in successfully',
        'Authentication successful',
        'Valid credentials provided',
        'Session initiated'
    ],
    'login_failed': [
        'Invalid password',
        'Wrong username or password',
        'Authentication failed',
        'Account not found',
        'Incorrect credentials'
    ],
    'access_denied': [
        'Insufficient permissions',
        'Access to resource denied',
        'Unauthorized resource request',
        'Permission denied'
    ],
    'data_breach': [
        'Suspicious data export detected',
        'Large data transfer detected',
        'Unusual database query',
        'Sensitive data access attempt'
    ],
    'unauthorized_access': [
        'Unauthorized system access attempt',
        'Privileged command execution attempt',
        'Elevated access denied',
        'Admin panel access denied'
    ]
}


def weighted_choice(choices):
    """Select item based on probability weights"""
    items = list(choices.keys())
    weights = list(choices.values())
    return random.choices(items, weights=weights)[0]


def generate_realistic_logs(num_logs=200, days_back=7):
    """Generate realistic log data spanning multiple days"""
    print(f"\n{'='*70}")
    print("GENERATING SAMPLE DATA FOR DEMO")
    print(f"{'='*70}\n")
    print(f"📊 Creating {num_logs} logs over {days_back} days...")
    
    created_count = 0
    failed_count = 0
    
    # Create users first
    print("\n🔧 Creating sample users...")
    create_sample_users()
    
    print("\n📝 Generating logs...")
    for i in range(num_logs):
        # Random time in the last N days
        days_ago = random.uniform(0, days_back)
        hours_ago = days_ago * 24
        minutes_ago = hours_ago * 60
        
        # Select random data
        event_type = weighted_choice(EVENT_TYPES)
        ip_address = random.choice(IP_ADDRESSES)
        username = random.choice(USERNAMES)
        severity = SEVERITIES[event_type]
        message = random.choice(MESSAGES[event_type])
        
        # Insert log
        result = insert_log(ip_address, username, event_type, message, severity)
        
        if result:
            created_count += 1
            if event_type == 'login_failed':
                failed_count += 1
            
            # Show progress every 50 logs
            if (i + 1) % 50 == 0:
                print(f"  ✅ Created {i + 1}/{num_logs} logs...")
        else:
            print(f"  ❌ Failed to create log {i + 1}")
        
        # Small delay to spread timestamps
        time.sleep(0.01)
    
    print(f"\n✅ Successfully created {created_count}/{num_logs} logs")
    print(f"   - Failed logins: {failed_count}")
    return created_count


def generate_attack_patterns():
    """Generate specific attack patterns to trigger anomaly detection"""
    print(f"\n{'='*70}")
    print("CREATING ATTACK PATTERNS FOR DEMO")
    print(f"{'='*70}\n")
    
    attack_count = 0
    
    # Pattern 1: Brute Force Attack
    print("🔨 Pattern 1: Brute Force Attack...")
    attack_ip = '198.51.100.10'
    for i in range(8):
        result = insert_log(
            attack_ip, 
            'admin', 
            'login_failed', 
            f'Brute force attempt {i+1}', 
            'medium'
        )
        if result:
            attack_count += 1
        time.sleep(0.1)
    print(f"   ✅ Created {8} brute force attempts from {attack_ip}")
    
    # Pattern 2: Account Compromise (different usernames)
    print("\n🎯 Pattern 2: Account Enumeration Attack...")
    attack_ip2 = '203.0.113.100'
    target_users = ['admin', 'root', 'john.doe', 'jane.smith', 'bob.wilson']
    for username in target_users:
        result = insert_log(
            attack_ip2, 
            username, 
            'login_failed', 
            'Account enumeration attempt', 
            'medium'
        )
        if result:
            attack_count += 1
        time.sleep(0.1)
    print(f"   ✅ Created {len(target_users)} enumeration attempts from {attack_ip2}")
    
    # Pattern 3: Login Spike (25 rapid logins)
    print("\n📈 Pattern 3: Login Spike...")
    spike_count = 0
    for i in range(25):
        ip = f"172.16.0.{random.randint(1, 50)}"
        event = 'login_success' if i % 2 == 0 else 'login_failed'
        result = insert_log(
            ip, 
            None, 
            event, 
            f'Spike login {i+1}', 
            'low' if event == 'login_success' else 'medium'
        )
        if result:
            spike_count += 1
        time.sleep(0.05)
    print(f"   ✅ Created {spike_count} rapid login events")
    
    # Pattern 4: High Severity Events
    print("\n⚠️  Pattern 4: High Severity Events Cluster...")
    severity_count = 0
    for i in range(4):
        result = insert_log(
            f"10.0.0.{random.randint(1, 50)}", 
            random.choice(USERNAMES), 
            'data_breach', 
            'Suspicious data export detected', 
            'high'
        )
        if result:
            severity_count += 1
        time.sleep(0.2)
    print(f"   ✅ Created {severity_count} high-severity events")
    
    print(f"\n✅ Total attack pattern logs: {attack_count + spike_count + severity_count}")
    return attack_count + spike_count + severity_count


def generate_sample_incidents():
    """Generate some manual incidents for demo"""
    print(f"\n{'='*70}")
    print("CREATING SAMPLE INCIDENTS")
    print(f"{'='*70}\n")
    
    incidents = [
        {
            'title': 'Suspicious Activity from External IP',
            'description': 'Multiple failed access attempts detected from external IP address. Possible reconnaissance activity.',
            'severity': 'medium',
            'reporter': 'john.doe'
        },
        {
            'title': 'Unusual After-Hours Database Access',
            'description': 'Database queries executed at 2:30 AM from admin account. Requires investigation.',
            'severity': 'high',
            'reporter': 'jane.smith'
        },
        {
            'title': 'Repeated Permission Escalation Attempts',
            'description': 'User bob.wilson attempted to access admin panel 3 times without authorization.',
            'severity': 'medium',
            'reporter': 'system'
        }
    ]
    
    created = 0
    for inc in incidents:
        result = create_incident(
            title=inc['title'],
            description=inc['description'],
            severity=inc['severity'],
            reporter=inc['reporter']
        )
        if result:
            created += 1
            print(f"✅ Created: {inc['title']}")
    
    print(f"\n✅ Created {created} sample incidents")
    return created


def create_sample_users():
    """Create sample users in database"""
    conn = get_db_connection()
    if not conn:
        print("❌ Failed to connect to database")
        return
    
    cursor = conn.cursor()
    # All usernames from USERNAMES list (except None)
    # Plus your specific admin accounts
    sample_users = [
        ('afkir', 'itirc123', 'admin'),  # Your admin account 1
        ('derkaoui', 'itirc123', 'admin'),  # Your admin account 2
        ('admin', 'demo_password', 'admin'),
        ('root', 'demo_password', 'admin'),
        ('john.doe', 'demo_password', 'analyst'),
        ('jane.smith', 'demo_password', 'analyst'),
        ('bob.wilson', 'demo_password', 'analyst'),
        ('alice.brown', 'demo_password', 'analyst'),
        ('charlie.davis', 'demo_password', 'analyst'),
        ('david.miller', 'demo_password', 'analyst'),
        ('emma.johnson', 'demo_password', 'analyst'),
        ('frank.garcia', 'demo_password', 'analyst'),
        ('grace.martinez', 'demo_password', 'analyst'),
        ('henry.rodriguez', 'demo_password', 'analyst')
    ]
    
    created = 0
    try:
        for user_data in sample_users:
            username, password, role = user_data
            try:
                # In production, you should hash passwords properly
                # For demo purposes, storing plain text (NOT recommended for real systems)
                cursor.execute("""
                    INSERT IGNORE INTO users (username, password_hash, role)
                    VALUES (%s, %s, %s)
                """, (username, password, role))
                created += 1
            except:
                pass  # User might already exist
        
        conn.commit()
        print(f"   ✅ Created/verified {len(sample_users)} sample users")
    except Exception as e:
        print(f"   ⚠️  Error creating users: {e}")
    finally:
        cursor.close()
        conn.close()


def cleanup_old_demo_data():
    """Clean up old demo data for fresh demo"""
    print(f"\n{'='*70}")
    print("CLEANING OLD DATA")
    print(f"{'='*70}\n")
    
    conn = get_db_connection()
    if not conn:
        return
    
    cursor = conn.cursor()
    try:
        # Check current counts
        cursor.execute("SELECT COUNT(*) as count FROM logs")
        log_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) as count FROM incidents")
        incident_count = cursor.fetchone()[0]
        
        print(f"📊 Current database state:")
        print(f"   - Logs: {log_count}")
        print(f"   - Incidents: {incident_count}")
        
        if log_count > 0 or incident_count > 0:
            print("\n🧹 Cleaning up old data for fresh demo...")
            cursor.execute("DELETE FROM incidents")
            cursor.execute("DELETE FROM logs")
            conn.commit()
            print("   ✅ Database cleaned and ready for new data")
        else:
            print("\n✅ Database is already empty")
    except Exception as e:
        print(f"   ❌ Error during cleanup: {e}")
    finally:
        cursor.close()
        conn.close()


def main():
    """Main function to generate all sample data"""
    print("\n" + "="*70)
    print("SAMPLE DATA GENERATOR FOR PROJECT DEMO")
    print("="*70)
    print("\nThis will generate realistic sample data to demonstrate:")
    print("  ✅ Log collection and storage")
    print("  ✅ Various event types and severities")
    print("  ✅ Attack patterns (brute force, enumeration, spikes)")
    print("  ✅ Anomaly detection capabilities")
    print("  ✅ Incident management")
    print("  ✅ Reporting features")
    print("\n" + "="*70)
    
    response = input("\nProceed with data generation? (y/n): ")
    if response.lower() != 'y':
        print("❌ Cancelled.")
        return
    
    # Check/cleanup existing data
    cleanup_old_demo_data()
    
    # Generate data
    start_time = time.time()
    
    logs_created = generate_realistic_logs(num_logs=200, days_back=7)
    attacks_created = generate_attack_patterns()
    incidents_created = generate_sample_incidents()
    
    elapsed = time.time() - start_time
    
    # Summary
    print(f"\n{'='*70}")
    print("GENERATION COMPLETE!")
    print(f"{'='*70}\n")
    print(f"📊 Summary:")
    print(f"   - Regular logs: {logs_created}")
    print(f"   - Attack patterns: {attacks_created}")
    print(f"   - Manual incidents: {incidents_created}")
    print(f"   - Total time: {elapsed:.2f} seconds")
    print(f"\n✅ Sample data ready for demo!")
    print(f"\n💡 Now you can:")
    print(f"   1. Run main.py and explore all features")
    print(f"   2. View logs (option 2)")
    print(f"   3. Search/filter logs (option 3)")
    print(f"   4. View incidents (option 4)")
    print(f"   5. Run anomaly detection (option 8) - will create more incidents!")
    print(f"   6. Generate weekly report (option 7)")
    print(f"\n{'='*70}\n")


if __name__ == "__main__":
    main()
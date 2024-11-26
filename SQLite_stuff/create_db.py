import sqlite3

# Connect to SQLite database (creates a file if it doesn't exist)
conn = sqlite3.connect("satisfactory_parts.db")
cursor = conn.cursor()

print("Database created and connected!")
conn.close()

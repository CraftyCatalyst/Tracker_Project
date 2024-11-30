import sqlite3

conn = sqlite3.connect("satisfactory_parts.db")
cursor = conn.cursor()

# Example query
cursor.execute("SELECT * FROM parts")
parts = cursor.fetchall()
for part in parts:
    print(part)

conn.close()

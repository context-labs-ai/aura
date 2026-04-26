import sqlite3
from .config import DB_PATH


def get_conn():
    return sqlite3.connect(DB_PATH)


def init_db():
    conn = get_conn()
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS recommendations (
        stock_code TEXT PRIMARY KEY,
        first_date TEXT,
        first_price REAL,
        score REAL,
        stage TEXT
    )
    """)

    c.execute("""
    CREATE TABLE IF NOT EXISTS performance (
        stock_code TEXT,
        recommendation_date TEXT,
        latest_price REAL,
        latest_return REAL
    )
    """)

    conn.commit()
    conn.close()

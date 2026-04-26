import os
import sqlite3
from datetime import datetime
from fastapi import FastAPI
import tushare as ts
import pandas as pd
from apscheduler.schedulers.background import BackgroundScheduler

TOKEN = os.getenv("TUSHARE_TOKEN")
ts.set_token(TOKEN)
pro = ts.pro_api()

DB_PATH = "backend.db"

app = FastAPI()


def init_db():
    conn = sqlite3.connect(DB_PATH)
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
    conn.commit()
    conn.close()


def get_stocks():
    df = pro.stock_basic(exchange='', list_status='L', fields='ts_code')
    return df['ts_code'].tolist()[:300]  # limit for speed


def get_data(code):
    df = pro.daily(ts_code=code, limit=120)
    return df.sort_values("trade_date")


def score_stock(df):
    if len(df) < 60:
        return 0, "none"

    close = df['close']
    high = close.max()
    low = close.min()

    drawdown = (high - low) / high
    score = 0

    if drawdown > 0.3:
        score += 20

    recent = close[-40:]
    if (recent.max() - recent.min()) / recent.mean() < 0.2:
        score += 30

    if close.iloc[-1] > recent.min() * 1.05:
        score += 20

    stage = "LPS" if score > 60 else "none"

    return score, stage


def save_rec(code, price, score, stage):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT * FROM recommendations WHERE stock_code=?", (code,))
    if not c.fetchone():
        c.execute("INSERT INTO recommendations VALUES (?, ?, ?, ?, ?)",
                  (code, datetime.now().date(), price, score, stage))
    conn.commit()
    conn.close()


def scan():
    stocks = get_stocks()
    results = []

    for s in stocks:
        df = get_data(s)
        if df.empty:
            continue

        score, stage = score_stock(df)
        if score > 60:
            price = df.iloc[-1]['close']
            save_rec(s, price, score, stage)
            results.append((s, score))

    return sorted(results, key=lambda x: x[1], reverse=True)[:20]


@app.get("/scan")
def run_scan():
    return scan()


@app.on_event("startup")
def startup():
    init_db()
    scheduler = BackgroundScheduler()
    scheduler.add_job(scan, 'cron', hour=16, minute=30)
    scheduler.start()

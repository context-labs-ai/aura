from fastapi import FastAPI
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime

from .database import init_db, get_conn
from .data_tushare import get_stock_list, get_daily
from .scanner import score_stock
from .config import SCAN_SCORE_THRESHOLD

app = FastAPI()

latest_results = []


def run_scan():
    global latest_results

    stocks = get_stock_list()
    results = []

    for s in stocks:
        df = get_daily(s)
        if df.empty:
            continue

        score, stage = score_stock(df)

        if score > SCAN_SCORE_THRESHOLD:
            price = df.iloc[-1]['close']

            conn = get_conn()
            c = conn.cursor()
            c.execute("SELECT * FROM recommendations WHERE stock_code=?", (s,))

            if not c.fetchone():
                c.execute("INSERT INTO recommendations VALUES (?, ?, ?, ?, ?)",
                          (s, datetime.now().date(), price, score, stage))

            conn.commit()
            conn.close()

            results.append({"code": s, "score": score, "stage": stage})

    latest_results = sorted(results, key=lambda x: x['score'], reverse=True)[:30]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/run-scan")
def trigger_scan():
    run_scan()
    return {"message": "scan completed"}


@app.get("/latest-results")
def get_results():
    return latest_results


@app.get("/recommendations")
def get_recommendations():
    conn = get_conn()
    c = conn.cursor()
    c.execute("SELECT * FROM recommendations")
    rows = c.fetchall()
    conn.close()
    return rows


@app.on_event("startup")
def startup():
    init_db()

    scheduler = BackgroundScheduler()
    scheduler.add_job(run_scan, 'cron', hour=16, minute=30)
    scheduler.start()

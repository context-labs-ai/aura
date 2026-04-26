import os
from dotenv import load_dotenv

load_dotenv()

TUSHARE_TOKEN = os.getenv("TUSHARE_TOKEN")
DB_PATH = "backend.db"
SCAN_SCORE_THRESHOLD = 60

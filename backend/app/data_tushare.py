import tushare as ts
import pandas as pd
from datetime import datetime, timedelta
from .config import TUSHARE_TOKEN

ts.set_token(TUSHARE_TOKEN)
pro = ts.pro_api()


def get_stock_list():
    df = pro.stock_basic(exchange='', list_status='L', fields='ts_code')
    return df['ts_code'].tolist()[:500]


def get_daily(ts_code):
    end = datetime.today().strftime('%Y%m%d')
    start = (datetime.today() - timedelta(days=400)).strftime('%Y%m%d')

    df = pro.daily(ts_code=ts_code, start_date=start, end_date=end)

    if df.empty:
        return df

    return df.sort_values('trade_date')

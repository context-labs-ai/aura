import numpy as np


def score_stock(df):
    if len(df) < 60:
        return 0, "none"

    close = df['close'].values
    high = close.max()
    low = close.min()

    drawdown = (high - low) / high
    score = 0

    if drawdown > 0.3:
        score += 20

    recent = close[-40:]
    if (recent.max() - recent.min()) / recent.mean() < 0.2:
        score += 30

    if close[-1] > recent.min() * 1.05:
        score += 20

    stage = "LPS" if score > 60 else "none"

    return score, stage

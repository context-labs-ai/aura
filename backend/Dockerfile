FROM python:3.11
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
ENV TUSHARE_TOKEN=your_token_here
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

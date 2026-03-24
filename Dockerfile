FROM python:3.10-slim
WORKDIR /app
COPY requirements-backend.txt .
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir -r requirements-backend.txt
COPY . .
# Use shell form to expand the $PORT environment variable assigned by Railway
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

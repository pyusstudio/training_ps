FROM python:3.11-slim

WORKDIR /app

RUN mkdir -p /app/data

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt /app/requirements.txt

# Install heavy ML packages first (they have large builds; split to reduce peak memory)
RUN pip install --no-cache-dir "faiss-cpu==1.9.0"
RUN pip install --no-cache-dir "fastembed==0.4.1"

# Install remaining dependencies
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY app /app/app

EXPOSE 8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

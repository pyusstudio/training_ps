FROM python:3.11-slim

WORKDIR /app

RUN mkdir -p /app/data
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt /app/requirements.txt

# Install Python dependencies
RUN pip install uv
RUN uv pip install --system --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN uv pip install --system --no-cache-dir -r /app/requirements.txt

COPY app /app/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

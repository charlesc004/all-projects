FROM python:3.14-slim
WORKDIR /app
COPY apps/api .
RUN pip install --no-cache-dir -r requirements.lock
CMD ["python", "-m", "scripts.start"]

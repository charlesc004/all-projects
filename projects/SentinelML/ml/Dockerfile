FROM python:3.12-slim
WORKDIR /app
COPY ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ml /app/ml
CMD ["python", "-m", "ml.src.train", "--output", "/artifacts/v1"]

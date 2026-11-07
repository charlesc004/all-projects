import os
import subprocess
import sys

subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)
if os.environ.get("SEED_DEMO", "false").lower() == "true":
    subprocess.run([sys.executable, "-m", "scripts.seed"], check=True)
os.execvp(
    "uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
)

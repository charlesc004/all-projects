"""Generate local credentials without overwriting existing configuration."""

import secrets
from pathlib import Path

root = Path(__file__).resolve().parents[1]
root_env = root / ".env"
api_env = root / "apps/api/.env"
if root_env.exists() or api_env.exists():
    raise SystemExit(
        "Existing .env found. Configuration preserved; edit it explicitly if needed."
    )
password, secret = secrets.token_urlsafe(24), secrets.token_urlsafe(48)
root_env.write_text(
    f"POSTGRES_USER=sereno\nPOSTGRES_PASSWORD={password}\nPOSTGRES_DB=sereno\nSECRET_KEY={secret}\nORIGIN=http://localhost:8080\nENVIRONMENT=development\nCOOKIE_SECURE=false\nSEED_DEMO=true\n",
    encoding="utf-8",
)
api_env.parent.mkdir(parents=True, exist_ok=True)
api_env.write_text(
    f"DATABASE_URL=postgresql+asyncpg://sereno:{password}@localhost:5432/sereno\nSECRET_KEY={secret}\nORIGIN=http://localhost:5173\nENVIRONMENT=development\nCOOKIE_SECURE=false\n",
    encoding="utf-8",
)
print("Generated .env and apps/api/.env with fresh local credentials.")

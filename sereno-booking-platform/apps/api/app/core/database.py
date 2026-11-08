from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


engine = create_async_engine(settings().database_url, pool_pre_ping=True, pool_size=10)
Session = async_sessionmaker(engine, expire_on_commit=False)


async def database() -> AsyncIterator[AsyncSession]:
    async with Session() as session, session.begin():
        yield session

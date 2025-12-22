"""Pytest configuration and fixtures for backend tests."""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base, get_db
from app.core.security import get_password_hash, create_access_token


# Test database URL (in-memory SQLite)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def async_engine():
    """Create async engine for each test function."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def async_session(async_engine):
    """Create async session for each test function."""
    async_session_factory = sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with async_session_factory() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def client(async_engine, async_session):
    """Create test client with overridden database dependency."""
    async def override_get_db():
        yield async_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(async_session):
    """Create a test user in the database."""
    from app.models.user import User

    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpassword123"),
        name="Test User"
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_user_token(test_user):
    """Create access token for test user."""
    token_data = {
        "sub": str(test_user.id),
        "email": test_user.email,
        "auth_level": test_user.auth_level.value,
        "tier": test_user.subscription_tier.value,
    }
    return create_access_token(token_data)


@pytest_asyncio.fixture
async def auth_headers(test_user_token):
    """Create authorization headers for authenticated requests."""
    return {"Authorization": f"Bearer {test_user_token}"}


@pytest_asyncio.fixture
async def test_contract(async_session, test_user):
    """Create a test contract in the database."""
    from app.models.contract import Contract, ContractType

    contract = Contract(
        user_id=test_user.id,
        title="Test Contract",
        description="A test contract for testing",
        contract_type=ContractType.NDA,
    )
    async_session.add(contract)
    await async_session.commit()
    await async_session.refresh(contract)
    return contract

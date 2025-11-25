"""
Test fixtures for Opportunity tests
"""
import pytest
import pytest_asyncio
from uuid import uuid4
from decimal import Decimal
from datetime import date, timedelta

from models.tenant import Tenant
from models.user import User, UserRole
from models.client import Client, ClientStatus
from modules.opportunities.models import Opportunity, OpportunityStage


@pytest_asyncio.fixture
async def test_tenant(db_session):
    """Create a test tenant"""
    tenant = Tenant(
        id=uuid4(),
        name="Test Company",
        subdomain="testcompany",
        is_active=True
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest_asyncio.fixture
async def test_user(db_session, test_tenant):
    """Create a test user"""
    user = User(
        id=uuid4(),
        tenant_id=test_tenant.id,
        email="test@example.com",
        hashed_password="hashed_password_here",
        full_name="Test User",
        role=UserRole.SALES_REP,
        is_active=True,
        is_verified=True
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_client(db_session, test_tenant):
    """Create a test client"""
    client = Client(
        id=uuid4(),
        tenant_id=test_tenant.id,
        name="Test Client Inc.",
        email="client@example.com",
        phone="+1234567890",
        status=ClientStatus.ACTIVE,
        is_active=True
    )
    db_session.add(client)
    await db_session.commit()
    await db_session.refresh(client)
    return client


@pytest_asyncio.fixture
async def test_opportunity(db_session, test_tenant, test_user, test_client):
    """Create a test opportunity"""
    opportunity = Opportunity(
        id=uuid4(),
        tenant_id=test_tenant.id,
        name="Test Opportunity",
        description="Test opportunity description",
        client_id=test_client.id,
        assigned_to=test_user.id,
        estimated_value=Decimal("50000.00"),
        currency="USD",
        probability=Decimal("60.00"),
        expected_close_date=date.today() + timedelta(days=30),
        stage=OpportunityStage.PROPOSAL
    )
    db_session.add(opportunity)
    await db_session.commit()
    await db_session.refresh(opportunity)
    return opportunity


@pytest_asyncio.fixture
async def test_notification(db_session, test_tenant, test_user):
    """Create a test notification"""
    notification = Notification(
        id=uuid4(),
        tenant_id=test_tenant.id,
        user_id=test_user.id,
        title="Test Notification",
        message="This is a test notification",
        type=NotificationType.INFO,
        category=NotificationCategory.SYSTEM,
        is_read=False,
        email_sent=False
    )
    db_session.add(notification)
    await db_session.commit()
    await db_session.refresh(notification)
    return notification

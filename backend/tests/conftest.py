"""
Pytest configuration and fixtures
"""
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from uuid import uuid4
from decimal import Decimal
from datetime import date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from models.base import Base
from models.tenant import Tenant
from models.user import User, UserRole
from models.client import Client, ClientStatus
from modules.opportunities.models import Opportunity, OpportunityStage
from modules.notifications.models import Notification, NotificationType, NotificationCategory
from modules.accounts.models import AccountPlan, Milestone, SWOTItem, PlanStatus, MilestoneStatus, SWOTCategory
from core.config import settings

# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://test_user:test_password@localhost:5432/test_db"

# Create test engine
test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    poolclass=NullPool,
)

# Create test session factory
TestSessionLocal = async_sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Create a clean database session for each test
    """
    # Create tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Create session
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()

    # Drop tables
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(scope="session")
def anyio_backend():
    """Use asyncio as the async backend"""
    return "asyncio"


# ============================================================================
# Account Planner Fixtures
# ============================================================================


@pytest_asyncio.fixture
async def test_account_plan(db_session, test_tenant, test_user, test_client):
    """Create a test account plan"""
    plan = AccountPlan(
        id=uuid4(),
        tenant_id=test_tenant.id,
        title="Test Account Plan",
        description="A test strategic account plan",
        client_id=test_client.id,
        created_by=test_user.id,
        status=PlanStatus.ACTIVE,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=90),
        revenue_goal=Decimal("100000.00")
    )
    db_session.add(plan)
    await db_session.commit()
    await db_session.refresh(plan)
    return plan


@pytest_asyncio.fixture
async def test_milestone(db_session, test_account_plan):
    """Create a test milestone"""
    milestone = Milestone(
        id=uuid4(),
        tenant_id=test_account_plan.tenant_id,
        plan_id=test_account_plan.id,
        title="Test Milestone",
        description="A test milestone",
        due_date=test_account_plan.start_date + timedelta(days=30),
        status=MilestoneStatus.PENDING
    )
    db_session.add(milestone)
    await db_session.commit()
    await db_session.refresh(milestone)
    return milestone


@pytest_asyncio.fixture
async def test_completed_milestone(db_session, test_account_plan):
    """Create a test completed milestone"""
    milestone = Milestone(
        id=uuid4(),
        tenant_id=test_account_plan.tenant_id,
        plan_id=test_account_plan.id,
        title="Completed Milestone",
        description="A completed milestone",
        due_date=test_account_plan.start_date + timedelta(days=15),
        completion_date=date.today(),
        status=MilestoneStatus.COMPLETED
    )
    db_session.add(milestone)
    await db_session.commit()
    await db_session.refresh(milestone)
    return milestone


@pytest_asyncio.fixture
async def test_swot_item(db_session, test_account_plan):
    """Create a test SWOT item"""
    swot = SWOTItem(
        id=uuid4(),
        tenant_id=test_account_plan.tenant_id,
        plan_id=test_account_plan.id,
        category=SWOTCategory.STRENGTH,
        description="Strong existing relationship"
    )
    db_session.add(swot)
    await db_session.commit()
    await db_session.refresh(swot)
    return swot


@pytest_asyncio.fixture
async def test_account_plan_with_milestones(db_session, test_tenant, test_user, test_client):
    """Create a test account plan with multiple milestones and SWOT items"""
    plan = AccountPlan(
        id=uuid4(),
        tenant_id=test_tenant.id,
        title="Plan with Milestones",
        client_id=test_client.id,
        created_by=test_user.id,
        status=PlanStatus.ACTIVE,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=90)
    )
    db_session.add(plan)
    await db_session.flush()

    # Add milestones
    for i in range(3):
        milestone = Milestone(
            id=uuid4(),
            tenant_id=test_tenant.id,
            plan_id=plan.id,
            title=f"Milestone {i+1}",
            due_date=plan.start_date + timedelta(days=30 * (i+1)),
            status=MilestoneStatus.PENDING
        )
        db_session.add(milestone)

    # Add SWOT items
    for category in SWOTCategory:
        swot = SWOTItem(
            id=uuid4(),
            tenant_id=test_tenant.id,
            plan_id=plan.id,
            category=category,
            description=f"Test {category.value}"
        )
        db_session.add(swot)

    await db_session.commit()
    await db_session.refresh(plan)
    return plan


@pytest_asyncio.fixture
async def test_account_plan_with_completed_milestone(db_session, test_tenant, test_user, test_client):
    """Create a test account plan with a completed milestone (for delete prevention test)"""
    plan = AccountPlan(
        id=uuid4(),
        tenant_id=test_tenant.id,
        title="Plan with Completed Milestone",
        client_id=test_client.id,
        created_by=test_user.id,
        status=PlanStatus.ACTIVE,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=90)
    )
    db_session.add(plan)
    await db_session.flush()

    # Add completed milestone
    milestone = Milestone(
        id=uuid4(),
        tenant_id=test_tenant.id,
        plan_id=plan.id,
        title="Completed Milestone",
        due_date=plan.start_date + timedelta(days=15),
        completion_date=date.today(),
        status=MilestoneStatus.COMPLETED
    )
    db_session.add(milestone)

    await db_session.commit()
    await db_session.refresh(plan)
    return plan


@pytest_asyncio.fixture
async def test_account_plan_with_various_milestones(db_session, test_tenant, test_user, test_client):
    """Create a test account plan with milestones in various states"""
    plan = AccountPlan(
        id=uuid4(),
        tenant_id=test_tenant.id,
        title="Plan with Various Milestones",
        client_id=test_client.id,
        created_by=test_user.id,
        status=PlanStatus.ACTIVE,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=90)
    )
    db_session.add(plan)
    await db_session.flush()

    # Add milestones with different statuses
    statuses = [
        MilestoneStatus.PENDING,
        MilestoneStatus.IN_PROGRESS,
        MilestoneStatus.COMPLETED,
        MilestoneStatus.CANCELLED
    ]

    for i, status in enumerate(statuses):
        milestone = Milestone(
            id=uuid4(),
            tenant_id=test_tenant.id,
            plan_id=plan.id,
            title=f"Milestone {status.value}",
            due_date=plan.start_date + timedelta(days=20 * (i+1)),
            status=status,
            completion_date=date.today() if status == MilestoneStatus.COMPLETED else None
        )
        db_session.add(milestone)

    await db_session.commit()
    await db_session.refresh(plan)
    return plan


@pytest_asyncio.fixture
async def test_account_plan_with_complete_swot(db_session, test_tenant, test_user, test_client):
    """Create a test account plan with complete SWOT analysis"""
    plan = AccountPlan(
        id=uuid4(),
        tenant_id=test_tenant.id,
        title="Plan with Complete SWOT",
        client_id=test_client.id,
        created_by=test_user.id,
        status=PlanStatus.ACTIVE,
        start_date=date.today(),
        end_date=date.today() + timedelta(days=90)
    )
    db_session.add(plan)
    await db_session.flush()

    # Add multiple SWOT items per category
    swot_data = {
        SWOTCategory.STRENGTH: ["Strong team", "Good reputation"],
        SWOTCategory.WEAKNESS: ["Limited budget", "Resource constraints"],
        SWOTCategory.OPPORTUNITY: ["Market growth", "New technology", "Partnership potential"],
        SWOTCategory.THREAT: ["Competition", "Economic downturn"]
    }

    for category, items in swot_data.items():
        for description in items:
            swot = SWOTItem(
                id=uuid4(),
                tenant_id=test_tenant.id,
                plan_id=plan.id,
                category=category,
                description=description
            )
            db_session.add(swot)

    await db_session.commit()
    await db_session.refresh(plan)
    return plan

"""
Unit tests for Account Planner Repository
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from uuid import uuid4

from modules.accounts.models import AccountPlan, Milestone, SWOTItem, PlanStatus, MilestoneStatus, SWOTCategory
from modules.accounts.schemas import (
    AccountPlanCreate,
    AccountPlanUpdate,
    MilestoneCreate,
    MilestoneUpdate,
    SWOTItemCreate
)
from modules.accounts.repository import AccountPlanRepository
from core.exceptions import NotFoundError, ValidationError


@pytest.mark.asyncio
class TestAccountPlanRepository:
    """Test suite for AccountPlanRepository - Account Plan operations"""

    async def test_create_plan(self, db_session, test_tenant, test_user, test_client):
        """Test creating a new account plan"""
        repo = AccountPlanRepository(db_session)

        data = AccountPlanCreate(
            title="Q4 2025 Growth Strategy",
            description="Strategic plan for expanding enterprise services",
            client_id=test_client.id,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=90),
            revenue_goal=Decimal("250000.00"),
            status=PlanStatus.ACTIVE
        )

        plan = await repo.create_plan(
            data=data,
            tenant_id=test_tenant.id,
            created_by=test_user.id
        )

        assert plan.id is not None
        assert plan.title == "Q4 2025 Growth Strategy"
        assert plan.revenue_goal == Decimal("250000.00")
        assert plan.status == PlanStatus.ACTIVE
        assert plan.client_id == test_client.id
        assert plan.created_by == test_user.id

    async def test_create_plan_invalid_client(self, db_session, test_tenant, test_user):
        """Test creating plan with non-existent client"""
        repo = AccountPlanRepository(db_session)

        data = AccountPlanCreate(
            title="Test Plan",
            client_id=uuid4(),  # Non-existent client
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30)
        )

        with pytest.raises(ValidationError, match="Client not found"):
            await repo.create_plan(
                data=data,
                tenant_id=test_tenant.id,
                created_by=test_user.id
            )

    async def test_create_plan_invalid_dates(self, db_session, test_tenant, test_user, test_client):
        """Test creating plan with end_date before start_date"""
        repo = AccountPlanRepository(db_session)

        with pytest.raises(ValueError, match="end_date must be after start_date"):
            data = AccountPlanCreate(
                title="Invalid Plan",
                client_id=test_client.id,
                start_date=date.today(),
                end_date=date.today() - timedelta(days=1)  # Before start_date
            )

    async def test_get_plan(self, db_session, test_account_plan):
        """Test retrieving account plan by ID"""
        repo = AccountPlanRepository(db_session)

        plan = await repo.get_plan(
            plan_id=test_account_plan.id,
            tenant_id=test_account_plan.tenant_id
        )

        assert plan is not None
        assert plan.id == test_account_plan.id
        assert plan.title == test_account_plan.title

    async def test_get_plan_not_found(self, db_session, test_tenant):
        """Test retrieving non-existent plan"""
        repo = AccountPlanRepository(db_session)

        with pytest.raises(NotFoundError):
            await repo.get_plan(
                plan_id=uuid4(),
                tenant_id=test_tenant.id
            )

    async def test_get_plan_with_details(self, db_session, test_account_plan_with_milestones):
        """Test retrieving plan with milestones and SWOT items"""
        repo = AccountPlanRepository(db_session)

        plan = await repo.get_plan_with_details(
            plan_id=test_account_plan_with_milestones.id,
            tenant_id=test_account_plan_with_milestones.tenant_id
        )

        assert plan is not None
        assert len(plan.milestones) > 0
        assert len(plan.swot_items) > 0

    async def test_list_plans(self, db_session, test_tenant, test_user, test_client):
        """Test listing plans with pagination"""
        repo = AccountPlanRepository(db_session)

        # Create multiple plans
        for i in range(5):
            data = AccountPlanCreate(
                title=f"Plan {i}",
                client_id=test_client.id,
                start_date=date.today(),
                end_date=date.today() + timedelta(days=30 * (i + 1))
            )
            await repo.create_plan(
                data=data,
                tenant_id=test_tenant.id,
                created_by=test_user.id
            )

        # Test pagination
        plans, total = await repo.list_plans(
            tenant_id=test_tenant.id,
            page=1,
            page_size=3
        )

        assert len(plans) == 3
        assert total == 5

    async def test_list_plans_filter_by_client(self, db_session, test_tenant, test_user, test_client):
        """Test filtering plans by client"""
        repo = AccountPlanRepository(db_session)

        # Create plans
        data = AccountPlanCreate(
            title="Client Specific Plan",
            client_id=test_client.id,
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30)
        )
        await repo.create_plan(
            data=data,
            tenant_id=test_tenant.id,
            created_by=test_user.id
        )

        # Filter by client
        plans, total = await repo.list_plans(
            tenant_id=test_tenant.id,
            client_id=test_client.id,
            page=1,
            page_size=10
        )

        assert total >= 1
        assert all(p.client_id == test_client.id for p in plans)

    async def test_list_plans_filter_by_status(self, db_session, test_tenant, test_user, test_client):
        """Test filtering plans by status"""
        repo = AccountPlanRepository(db_session)

        # Create active plan
        data = AccountPlanCreate(
            title="Active Plan",
            client_id=test_client.id,
            start_date=date.today(),
            status=PlanStatus.ACTIVE
        )
        await repo.create_plan(
            data=data,
            tenant_id=test_tenant.id,
            created_by=test_user.id
        )

        # Filter by active status
        plans, total = await repo.list_plans(
            tenant_id=test_tenant.id,
            status=PlanStatus.ACTIVE,
            page=1,
            page_size=10
        )

        assert total >= 1
        assert all(p.status == PlanStatus.ACTIVE for p in plans)

    async def test_update_plan(self, db_session, test_account_plan):
        """Test updating an account plan"""
        repo = AccountPlanRepository(db_session)

        data = AccountPlanUpdate(
            title="Updated Plan Title",
            status=PlanStatus.COMPLETED,
            revenue_goal=Decimal("500000.00")
        )

        updated_plan = await repo.update_plan(
            plan_id=test_account_plan.id,
            tenant_id=test_account_plan.tenant_id,
            data=data
        )

        assert updated_plan.title == "Updated Plan Title"
        assert updated_plan.status == PlanStatus.COMPLETED
        assert updated_plan.revenue_goal == Decimal("500000.00")

    async def test_update_plan_invalid_dates(self, db_session, test_account_plan):
        """Test updating plan with invalid end_date"""
        repo = AccountPlanRepository(db_session)

        data = AccountPlanUpdate(
            start_date=date.today(),
            end_date=date.today() - timedelta(days=1)  # Before start_date
        )

        with pytest.raises(ValidationError, match="end_date must be after start_date"):
            await repo.update_plan(
                plan_id=test_account_plan.id,
                tenant_id=test_account_plan.tenant_id,
                data=data
            )

    async def test_delete_plan(self, db_session, test_account_plan):
        """Test soft deleting a plan"""
        repo = AccountPlanRepository(db_session)

        result = await repo.delete_plan(
            plan_id=test_account_plan.id,
            tenant_id=test_account_plan.tenant_id
        )

        assert result is True

        # Verify plan is soft deleted
        with pytest.raises(NotFoundError):
            await repo.get_plan(
                plan_id=test_account_plan.id,
                tenant_id=test_account_plan.tenant_id
            )

    async def test_delete_plan_with_completed_milestones(
        self, db_session, test_account_plan_with_completed_milestone
    ):
        """Test that deleting plan with completed milestones is prevented"""
        repo = AccountPlanRepository(db_session)

        with pytest.raises(ValidationError, match="Cannot delete plan with completed milestones"):
            await repo.delete_plan(
                plan_id=test_account_plan_with_completed_milestone.id,
                tenant_id=test_account_plan_with_completed_milestone.tenant_id
            )

    async def test_get_plans_by_client(self, db_session, test_tenant, test_user, test_client):
        """Test getting all plans for a specific client"""
        repo = AccountPlanRepository(db_session)

        # Create multiple plans for the same client
        for i in range(3):
            data = AccountPlanCreate(
                title=f"Client Plan {i}",
                client_id=test_client.id,
                start_date=date.today()
            )
            await repo.create_plan(
                data=data,
                tenant_id=test_tenant.id,
                created_by=test_user.id
            )

        plans = await repo.get_plans_by_client(
            client_id=test_client.id,
            tenant_id=test_tenant.id
        )

        assert len(plans) >= 3
        assert all(p.client_id == test_client.id for p in plans)


@pytest.mark.asyncio
class TestMilestoneRepository:
    """Test suite for AccountPlanRepository - Milestone operations"""

    async def test_create_milestone(self, db_session, test_account_plan):
        """Test creating a new milestone"""
        repo = AccountPlanRepository(db_session)

        data = MilestoneCreate(
            title="Complete needs assessment",
            description="Conduct comprehensive needs analysis",
            due_date=test_account_plan.start_date + timedelta(days=15),
            status=MilestoneStatus.PENDING
        )

        milestone = await repo.create_milestone(
            plan_id=test_account_plan.id,
            tenant_id=test_account_plan.tenant_id,
            data=data
        )

        assert milestone.id is not None
        assert milestone.title == "Complete needs assessment"
        assert milestone.status == MilestoneStatus.PENDING
        assert milestone.plan_id == test_account_plan.id

    async def test_create_milestone_due_date_before_plan_start(self, db_session, test_account_plan):
        """Test creating milestone with due_date before plan start_date"""
        repo = AccountPlanRepository(db_session)

        data = MilestoneCreate(
            title="Invalid Milestone",
            due_date=test_account_plan.start_date - timedelta(days=1)  # Before plan start
        )

        with pytest.raises(ValidationError, match="must be on or after plan start_date"):
            await repo.create_milestone(
                plan_id=test_account_plan.id,
                tenant_id=test_account_plan.tenant_id,
                data=data
            )

    async def test_create_milestone_due_date_after_plan_end(self, db_session, test_account_plan):
        """Test creating milestone with due_date after plan end_date"""
        repo = AccountPlanRepository(db_session)

        # Set plan end_date
        test_account_plan.end_date = test_account_plan.start_date + timedelta(days=30)
        db_session.commit()

        data = MilestoneCreate(
            title="Invalid Milestone",
            due_date=test_account_plan.end_date + timedelta(days=1)  # After plan end
        )

        with pytest.raises(ValidationError, match="must be on or before plan end_date"):
            await repo.create_milestone(
                plan_id=test_account_plan.id,
                tenant_id=test_account_plan.tenant_id,
                data=data
            )

    async def test_get_milestone(self, db_session, test_milestone):
        """Test retrieving milestone by ID"""
        repo = AccountPlanRepository(db_session)

        milestone = await repo.get_milestone(
            milestone_id=test_milestone.id,
            tenant_id=test_milestone.tenant_id
        )

        assert milestone is not None
        assert milestone.id == test_milestone.id
        assert milestone.title == test_milestone.title

    async def test_get_milestone_not_found(self, db_session, test_tenant):
        """Test retrieving non-existent milestone"""
        repo = AccountPlanRepository(db_session)

        with pytest.raises(NotFoundError):
            await repo.get_milestone(
                milestone_id=uuid4(),
                tenant_id=test_tenant.id
            )

    async def test_update_milestone(self, db_session, test_milestone):
        """Test updating a milestone"""
        repo = AccountPlanRepository(db_session)

        data = MilestoneUpdate(
            title="Updated Milestone Title",
            status=MilestoneStatus.IN_PROGRESS
        )

        updated_milestone = await repo.update_milestone(
            milestone_id=test_milestone.id,
            tenant_id=test_milestone.tenant_id,
            data=data
        )

        assert updated_milestone.title == "Updated Milestone Title"
        assert updated_milestone.status == MilestoneStatus.IN_PROGRESS

    async def test_update_milestone_auto_set_completion_date(self, db_session, test_milestone):
        """Test that completion_date is auto-set when marking as completed"""
        repo = AccountPlanRepository(db_session)

        data = MilestoneUpdate(
            status=MilestoneStatus.COMPLETED
        )

        updated_milestone = await repo.update_milestone(
            milestone_id=test_milestone.id,
            tenant_id=test_milestone.tenant_id,
            data=data
        )

        assert updated_milestone.status == MilestoneStatus.COMPLETED
        assert updated_milestone.completion_date is not None
        assert updated_milestone.completion_date == date.today()

    async def test_update_milestone_clear_completion_date(self, db_session, test_completed_milestone):
        """Test that completion_date is cleared when changing from completed status"""
        repo = AccountPlanRepository(db_session)

        data = MilestoneUpdate(
            status=MilestoneStatus.IN_PROGRESS
        )

        updated_milestone = await repo.update_milestone(
            milestone_id=test_completed_milestone.id,
            tenant_id=test_completed_milestone.tenant_id,
            data=data
        )

        assert updated_milestone.status == MilestoneStatus.IN_PROGRESS
        assert updated_milestone.completion_date is None

    async def test_delete_milestone(self, db_session, test_milestone):
        """Test soft deleting a milestone"""
        repo = AccountPlanRepository(db_session)

        result = await repo.delete_milestone(
            milestone_id=test_milestone.id,
            tenant_id=test_milestone.tenant_id
        )

        assert result is True

        # Verify milestone is soft deleted
        with pytest.raises(NotFoundError):
            await repo.get_milestone(
                milestone_id=test_milestone.id,
                tenant_id=test_milestone.tenant_id
            )


@pytest.mark.asyncio
class TestSWOTItemRepository:
    """Test suite for AccountPlanRepository - SWOT Item operations"""

    async def test_create_swot_item(self, db_session, test_account_plan):
        """Test creating a new SWOT item"""
        repo = AccountPlanRepository(db_session)

        data = SWOTItemCreate(
            category=SWOTCategory.STRENGTH,
            description="Strong existing relationship with C-level executives"
        )

        swot_item = await repo.create_swot_item(
            plan_id=test_account_plan.id,
            tenant_id=test_account_plan.tenant_id,
            data=data
        )

        assert swot_item.id is not None
        assert swot_item.category == SWOTCategory.STRENGTH
        assert swot_item.description == "Strong existing relationship with C-level executives"
        assert swot_item.plan_id == test_account_plan.id

    async def test_create_swot_items_all_categories(self, db_session, test_account_plan):
        """Test creating SWOT items for all categories"""
        repo = AccountPlanRepository(db_session)

        categories = [
            (SWOTCategory.STRENGTH, "Strong technical team"),
            (SWOTCategory.WEAKNESS, "Limited budget"),
            (SWOTCategory.OPPORTUNITY, "Market expansion potential"),
            (SWOTCategory.THREAT, "Competitive pressure")
        ]

        for category, description in categories:
            data = SWOTItemCreate(
                category=category,
                description=description
            )

            swot_item = await repo.create_swot_item(
                plan_id=test_account_plan.id,
                tenant_id=test_account_plan.tenant_id,
                data=data
            )

            assert swot_item.category == category
            assert swot_item.description == description

    async def test_get_swot_item(self, db_session, test_swot_item):
        """Test retrieving SWOT item by ID"""
        repo = AccountPlanRepository(db_session)

        swot_item = await repo.get_swot_item(
            swot_id=test_swot_item.id,
            tenant_id=test_swot_item.tenant_id
        )

        assert swot_item is not None
        assert swot_item.id == test_swot_item.id
        assert swot_item.category == test_swot_item.category

    async def test_get_swot_item_not_found(self, db_session, test_tenant):
        """Test retrieving non-existent SWOT item"""
        repo = AccountPlanRepository(db_session)

        with pytest.raises(NotFoundError):
            await repo.get_swot_item(
                swot_id=uuid4(),
                tenant_id=test_tenant.id
            )

    async def test_delete_swot_item(self, db_session, test_swot_item):
        """Test soft deleting a SWOT item"""
        repo = AccountPlanRepository(db_session)

        result = await repo.delete_swot_item(
            swot_id=test_swot_item.id,
            tenant_id=test_swot_item.tenant_id
        )

        assert result is True

        # Verify SWOT item is soft deleted
        with pytest.raises(NotFoundError):
            await repo.get_swot_item(
                swot_id=test_swot_item.id,
                tenant_id=test_swot_item.tenant_id
            )


@pytest.mark.asyncio
class TestAccountPlanStats:
    """Test suite for AccountPlanRepository - Statistics operations"""

    async def test_get_plan_stats(self, db_session, test_account_plan_with_milestones):
        """Test getting comprehensive plan statistics"""
        repo = AccountPlanRepository(db_session)

        stats = await repo.get_plan_stats(
            plan_id=test_account_plan_with_milestones.id,
            tenant_id=test_account_plan_with_milestones.tenant_id
        )

        assert stats.plan_id == test_account_plan_with_milestones.id
        assert stats.title == test_account_plan_with_milestones.title
        assert stats.status == test_account_plan_with_milestones.status
        assert stats.milestones.total > 0
        assert stats.swot.total_items > 0

    async def test_get_plan_stats_milestone_breakdown(
        self, db_session, test_account_plan_with_various_milestones
    ):
        """Test milestone statistics breakdown by status"""
        repo = AccountPlanRepository(db_session)

        stats = await repo.get_plan_stats(
            plan_id=test_account_plan_with_various_milestones.id,
            tenant_id=test_account_plan_with_various_milestones.tenant_id
        )

        assert stats.milestones.pending >= 0
        assert stats.milestones.in_progress >= 0
        assert stats.milestones.completed >= 0
        assert stats.milestones.cancelled >= 0
        assert stats.milestones.completion_rate >= 0
        assert stats.milestones.completion_rate <= 100

    async def test_get_plan_stats_swot_breakdown(
        self, db_session, test_account_plan_with_complete_swot
    ):
        """Test SWOT statistics breakdown by category"""
        repo = AccountPlanRepository(db_session)

        stats = await repo.get_plan_stats(
            plan_id=test_account_plan_with_complete_swot.id,
            tenant_id=test_account_plan_with_complete_swot.tenant_id
        )

        assert stats.swot.strengths_count >= 0
        assert stats.swot.weaknesses_count >= 0
        assert stats.swot.opportunities_count >= 0
        assert stats.swot.threats_count >= 0
        assert stats.swot.total_items == (
            stats.swot.strengths_count +
            stats.swot.weaknesses_count +
            stats.swot.opportunities_count +
            stats.swot.threats_count
        )

    async def test_get_plan_stats_days_remaining(self, db_session, test_account_plan):
        """Test days remaining calculation"""
        repo = AccountPlanRepository(db_session)

        # Set end_date to future
        test_account_plan.end_date = date.today() + timedelta(days=45)
        db_session.commit()

        stats = await repo.get_plan_stats(
            plan_id=test_account_plan.id,
            tenant_id=test_account_plan.tenant_id
        )

        assert stats.days_remaining is not None
        assert stats.days_remaining >= 0

    async def test_get_plan_stats_no_end_date(self, db_session, test_account_plan):
        """Test statistics when plan has no end_date"""
        repo = AccountPlanRepository(db_session)

        # Clear end_date
        test_account_plan.end_date = None
        db_session.commit()

        stats = await repo.get_plan_stats(
            plan_id=test_account_plan.id,
            tenant_id=test_account_plan.tenant_id
        )

        assert stats.days_remaining is None

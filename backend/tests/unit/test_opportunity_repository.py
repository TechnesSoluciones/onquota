"""
Unit tests for Opportunity Repository
"""
import pytest
from decimal import Decimal
from datetime import date, timedelta
from uuid import uuid4

from modules.opportunities.models import Opportunity, OpportunityStage
from modules.opportunities.schemas import OpportunityCreate, OpportunityUpdate
from modules.opportunities.repository import OpportunityRepository
from models.client import Client
from models.user import User
from core.exceptions import NotFoundError, ValidationError


@pytest.mark.asyncio
class TestOpportunityRepository:
    """Test suite for OpportunityRepository"""

    async def test_create_opportunity(self, db_session, test_tenant, test_user, test_client):
        """Test creating a new opportunity"""
        repo = OpportunityRepository(db_session)

        data = OpportunityCreate(
            name="Enterprise Software Deal",
            description="Large enterprise software license",
            client_id=test_client.id,
            estimated_value=Decimal("100000.00"),
            currency="USD",
            probability=Decimal("75.00"),
            expected_close_date=date.today() + timedelta(days=30),
            stage=OpportunityStage.PROPOSAL
        )

        opportunity = await repo.create_opportunity(
            data=data,
            tenant_id=test_tenant.id,
            assigned_to=test_user.id
        )

        assert opportunity.id is not None
        assert opportunity.name == "Enterprise Software Deal"
        assert opportunity.estimated_value == Decimal("100000.00")
        assert opportunity.probability == Decimal("75.00")
        assert opportunity.stage == OpportunityStage.PROPOSAL
        assert opportunity.weighted_value == 75000.0  # 100000 * 0.75

    async def test_create_opportunity_invalid_client(self, db_session, test_tenant, test_user):
        """Test creating opportunity with non-existent client"""
        repo = OpportunityRepository(db_session)

        data = OpportunityCreate(
            name="Test Opportunity",
            client_id=uuid4(),  # Non-existent client
            estimated_value=Decimal("50000.00"),
            probability=Decimal("50.00"),
        )

        with pytest.raises(ValidationError, match="Client not found"):
            await repo.create_opportunity(
                data=data,
                tenant_id=test_tenant.id,
                assigned_to=test_user.id
            )

    async def test_get_opportunity_by_id(self, db_session, test_opportunity):
        """Test retrieving opportunity by ID"""
        repo = OpportunityRepository(db_session)

        opportunity = await repo.get_opportunity_by_id(
            opportunity_id=test_opportunity.id,
            tenant_id=test_opportunity.tenant_id
        )

        assert opportunity is not None
        assert opportunity.id == test_opportunity.id
        assert opportunity.name == test_opportunity.name

    async def test_get_opportunity_not_found(self, db_session, test_tenant):
        """Test retrieving non-existent opportunity"""
        repo = OpportunityRepository(db_session)

        with pytest.raises(NotFoundError):
            await repo.get_opportunity_by_id(
                opportunity_id=uuid4(),
                tenant_id=test_tenant.id
            )

    async def test_list_opportunities(self, db_session, test_tenant, test_user, test_client):
        """Test listing opportunities with pagination"""
        repo = OpportunityRepository(db_session)

        # Create multiple opportunities
        for i in range(5):
            data = OpportunityCreate(
                name=f"Opportunity {i}",
                client_id=test_client.id,
                estimated_value=Decimal(f"{10000 * (i + 1)}.00"),
                probability=Decimal("50.00"),
            )
            await repo.create_opportunity(
                data=data,
                tenant_id=test_tenant.id,
                assigned_to=test_user.id
            )

        # Test pagination
        opportunities, total = await repo.get_opportunities(
            tenant_id=test_tenant.id,
            page=1,
            page_size=3
        )

        assert len(opportunities) == 3
        assert total == 5

    async def test_list_opportunities_filter_by_stage(self, db_session, test_tenant, test_user, test_client):
        """Test filtering opportunities by stage"""
        repo = OpportunityRepository(db_session)

        # Create opportunities in different stages
        stages = [OpportunityStage.LEAD, OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION]
        for stage in stages:
            data = OpportunityCreate(
                name=f"Opportunity {stage.value}",
                client_id=test_client.id,
                estimated_value=Decimal("50000.00"),
                probability=Decimal("50.00"),
                stage=stage
            )
            await repo.create_opportunity(
                data=data,
                tenant_id=test_tenant.id,
                assigned_to=test_user.id
            )

        # Filter by PROPOSAL stage
        opportunities, total = await repo.get_opportunities(
            tenant_id=test_tenant.id,
            stage=OpportunityStage.PROPOSAL,
            page=1,
            page_size=10
        )

        assert total == 1
        assert opportunities[0].stage == OpportunityStage.PROPOSAL

    async def test_update_opportunity(self, db_session, test_opportunity):
        """Test updating an opportunity"""
        repo = OpportunityRepository(db_session)

        data = OpportunityUpdate(
            name="Updated Opportunity Name",
            estimated_value=Decimal("150000.00"),
            probability=Decimal("80.00"),
        )

        updated = await repo.update_opportunity(
            opportunity_id=test_opportunity.id,
            tenant_id=test_opportunity.tenant_id,
            data=data
        )

        assert updated.name == "Updated Opportunity Name"
        assert updated.estimated_value == Decimal("150000.00")
        assert updated.probability == Decimal("80.00")

    async def test_update_stage(self, db_session, test_opportunity):
        """Test updating opportunity stage"""
        repo = OpportunityRepository(db_session)

        updated = await repo.update_stage(
            opportunity_id=test_opportunity.id,
            tenant_id=test_opportunity.tenant_id,
            new_stage=OpportunityStage.NEGOTIATION
        )

        assert updated.stage == OpportunityStage.NEGOTIATION

    async def test_close_opportunity_as_won(self, db_session, test_opportunity):
        """Test closing opportunity as won"""
        repo = OpportunityRepository(db_session)

        updated = await repo.update_stage(
            opportunity_id=test_opportunity.id,
            tenant_id=test_opportunity.tenant_id,
            new_stage=OpportunityStage.CLOSED_WON
        )

        assert updated.stage == OpportunityStage.CLOSED_WON
        assert updated.probability == Decimal("100.00")
        assert updated.actual_close_date is not None
        assert updated.is_closed is True
        assert updated.is_won is True

    async def test_close_opportunity_as_lost(self, db_session, test_opportunity):
        """Test closing opportunity as lost with reason"""
        repo = OpportunityRepository(db_session)

        updated = await repo.update_stage(
            opportunity_id=test_opportunity.id,
            tenant_id=test_opportunity.tenant_id,
            new_stage=OpportunityStage.CLOSED_LOST,
            loss_reason="Competitor had better pricing"
        )

        assert updated.stage == OpportunityStage.CLOSED_LOST
        assert updated.probability == Decimal("0.00")
        assert updated.actual_close_date is not None
        assert updated.loss_reason == "Competitor had better pricing"
        assert updated.is_closed is True
        assert updated.is_won is False

    async def test_close_as_lost_without_reason_fails(self, db_session, test_opportunity):
        """Test closing as lost without reason fails validation"""
        repo = OpportunityRepository(db_session)

        with pytest.raises(ValidationError, match="Loss reason is required"):
            await repo.update_stage(
                opportunity_id=test_opportunity.id,
                tenant_id=test_opportunity.tenant_id,
                new_stage=OpportunityStage.CLOSED_LOST
            )

    async def test_cannot_change_closed_opportunity(self, db_session, test_opportunity):
        """Test that closed opportunities cannot be changed"""
        repo = OpportunityRepository(db_session)

        # Close opportunity
        await repo.update_stage(
            opportunity_id=test_opportunity.id,
            tenant_id=test_opportunity.tenant_id,
            new_stage=OpportunityStage.CLOSED_WON
        )

        # Try to change stage
        with pytest.raises(ValidationError, match="Cannot change stage of closed opportunity"):
            await repo.update_stage(
                opportunity_id=test_opportunity.id,
                tenant_id=test_opportunity.tenant_id,
                new_stage=OpportunityStage.PROPOSAL
            )

    async def test_delete_opportunity(self, db_session, test_opportunity):
        """Test soft deleting an opportunity"""
        repo = OpportunityRepository(db_session)

        result = await repo.delete_opportunity(
            opportunity_id=test_opportunity.id,
            tenant_id=test_opportunity.tenant_id
        )

        assert result is True

        # Verify it's soft deleted
        with pytest.raises(NotFoundError):
            await repo.get_opportunity_by_id(
                opportunity_id=test_opportunity.id,
                tenant_id=test_opportunity.tenant_id
            )

    async def test_get_pipeline_summary(self, db_session, test_tenant, test_user, test_client):
        """Test getting pipeline summary statistics"""
        repo = OpportunityRepository(db_session)

        # Create opportunities in different stages
        opportunities_data = [
            (OpportunityStage.LEAD, Decimal("50000.00"), Decimal("30.00")),
            (OpportunityStage.QUALIFIED, Decimal("75000.00"), Decimal("50.00")),
            (OpportunityStage.PROPOSAL, Decimal("100000.00"), Decimal("70.00")),
            (OpportunityStage.CLOSED_WON, Decimal("60000.00"), Decimal("100.00")),
            (OpportunityStage.CLOSED_LOST, Decimal("40000.00"), Decimal("0.00")),
        ]

        for stage, value, probability in opportunities_data:
            data = OpportunityCreate(
                name=f"Opportunity {stage.value}",
                client_id=test_client.id,
                estimated_value=value,
                probability=probability,
                stage=stage
            )
            await repo.create_opportunity(
                data=data,
                tenant_id=test_tenant.id,
                assigned_to=test_user.id
            )

        # Get summary
        summary = await repo.get_pipeline_summary(
            tenant_id=test_tenant.id
        )

        assert summary.total_opportunities == 5
        assert summary.total_value == Decimal("325000.00")
        assert summary.total_won == 1
        assert summary.total_lost == 1
        assert summary.active_opportunities == 3
        assert summary.win_rate == Decimal("50.00")  # 1 won out of 2 closed

    async def test_get_overdue_opportunities(self, db_session, test_tenant, test_user, test_client):
        """Test finding overdue opportunities"""
        repo = OpportunityRepository(db_session)

        # Create overdue opportunity
        data = OpportunityCreate(
            name="Overdue Opportunity",
            client_id=test_client.id,
            estimated_value=Decimal("50000.00"),
            probability=Decimal("60.00"),
            expected_close_date=date.today() - timedelta(days=10)  # 10 days overdue
        )
        await repo.create_opportunity(
            data=data,
            tenant_id=test_tenant.id,
            assigned_to=test_user.id
        )

        # Find overdue opportunities
        overdue = await repo.get_overdue_opportunities(
            tenant_id=test_tenant.id
        )

        assert len(overdue) == 1
        assert overdue[0].expected_close_date < date.today()
        assert overdue[0].stage not in [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]

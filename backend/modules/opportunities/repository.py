"""
Repository for Opportunity CRUD operations and business logic
"""
from typing import Optional, Tuple
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from models.opportunity import Opportunity, OpportunityStage
from modules.opportunities.schemas import (
    OpportunityCreate,
    OpportunityUpdate,
    PipelineSummary,
    PipelineStageStats
)
from models.client import Client
from models.user import User
from core.exceptions import NotFoundError, ValidationError


class OpportunityRepository:
    """Repository for managing opportunities"""

    def __init__(self, db: Session):
        self.db = db

    async def create_opportunity(
        self,
        data: OpportunityCreate,
        tenant_id: UUID,
        assigned_to: UUID
    ) -> Opportunity:
        """
        Create a new opportunity

        Args:
            data: Opportunity creation data
            tenant_id: Tenant UUID
            assigned_to: User UUID who owns this opportunity

        Returns:
            Created Opportunity instance

        Raises:
            ValidationError: If client doesn't exist or belongs to different tenant
        """
        # Verify client exists and belongs to tenant
        client = self.db.execute(
            select(Client).where(
                and_(
                    Client.id == data.client_id,
                    Client.tenant_id == tenant_id,
                    Client.is_deleted == False
                )
            )
        ).scalar_one_or_none()

        if not client:
            raise ValidationError("Client not found or doesn't belong to your organization")

        # Verify user exists and belongs to tenant
        user = self.db.execute(
            select(User).where(
                and_(
                    User.id == assigned_to,
                    User.tenant_id == tenant_id,
                    User.is_deleted == False
                )
            )
        ).scalar_one_or_none()

        if not user:
            raise ValidationError("User not found or doesn't belong to your organization")

        # Create opportunity
        opportunity = Opportunity(
            tenant_id=tenant_id,
            name=data.name,
            description=data.description,
            client_id=data.client_id,
            assigned_to=assigned_to,
            estimated_value=data.estimated_value,
            currency=data.currency,
            probability=data.probability,
            expected_close_date=data.expected_close_date,
            stage=data.stage
        )

        self.db.add(opportunity)
        self.db.commit()
        self.db.refresh(opportunity)

        return opportunity

    async def get_opportunity_by_id(
        self,
        opportunity_id: UUID,
        tenant_id: UUID
    ) -> Opportunity:
        """
        Get opportunity by ID

        Args:
            opportunity_id: Opportunity UUID
            tenant_id: Tenant UUID

        Returns:
            Opportunity instance

        Raises:
            NotFoundError: If opportunity not found
        """
        query = (
            select(Opportunity)
            .options(
                joinedload(Opportunity.client),
                joinedload(Opportunity.sales_rep)
            )
            .where(
                and_(
                    Opportunity.id == opportunity_id,
                    Opportunity.tenant_id == tenant_id,
                    Opportunity.is_deleted == False
                )
            )
        )

        result = self.db.execute(query)
        opportunity = result.scalar_one_or_none()

        if not opportunity:
            raise NotFoundError("Opportunity not found")

        return opportunity

    async def get_opportunities(
        self,
        tenant_id: UUID,
        stage: Optional[OpportunityStage] = None,
        assigned_to: Optional[UUID] = None,
        client_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[list[Opportunity], int]:
        """
        Get paginated list of opportunities with filters

        Args:
            tenant_id: Tenant UUID
            stage: Filter by stage
            assigned_to: Filter by assigned user
            client_id: Filter by client
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (opportunities list, total count)
        """
        # Build base query
        query = (
            select(Opportunity)
            .options(
                joinedload(Opportunity.client),
                joinedload(Opportunity.sales_rep)
            )
            .where(
                and_(
                    Opportunity.tenant_id == tenant_id,
                    Opportunity.is_deleted == False
                )
            )
        )

        # Apply filters
        if stage:
            query = query.where(Opportunity.stage == stage)
        if assigned_to:
            query = query.where(Opportunity.assigned_to == assigned_to)
        if client_id:
            query = query.where(Opportunity.client_id == client_id)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar()

        # Apply pagination and ordering
        query = query.order_by(Opportunity.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        # Execute query
        result = self.db.execute(query)
        opportunities = result.scalars().all()

        return opportunities, total

    async def update_opportunity(
        self,
        opportunity_id: UUID,
        tenant_id: UUID,
        data: OpportunityUpdate
    ) -> Opportunity:
        """
        Update an opportunity

        Args:
            opportunity_id: Opportunity UUID
            tenant_id: Tenant UUID
            data: Update data

        Returns:
            Updated Opportunity instance

        Raises:
            NotFoundError: If opportunity not found
        """
        opportunity = await self.get_opportunity_by_id(opportunity_id, tenant_id)

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(opportunity, field, value)

        # If closing as won, set actual close date
        if data.stage == OpportunityStage.CLOSED_WON:
            opportunity.actual_close_date = date.today()
            opportunity.probability = Decimal("100.00")
        elif data.stage == OpportunityStage.CLOSED_LOST:
            opportunity.actual_close_date = date.today()
            opportunity.probability = Decimal("0.00")

        self.db.commit()
        self.db.refresh(opportunity)

        return opportunity

    async def update_stage(
        self,
        opportunity_id: UUID,
        tenant_id: UUID,
        new_stage: OpportunityStage,
        loss_reason: Optional[str] = None
    ) -> Opportunity:
        """
        Update opportunity stage

        Args:
            opportunity_id: Opportunity UUID
            tenant_id: Tenant UUID
            new_stage: New stage
            loss_reason: Reason if closing as lost

        Returns:
            Updated Opportunity instance

        Raises:
            NotFoundError: If opportunity not found
            ValidationError: If validation fails
        """
        opportunity = await self.get_opportunity_by_id(opportunity_id, tenant_id)

        # Validate stage transition
        if opportunity.is_closed:
            raise ValidationError("Cannot change stage of closed opportunity")

        # Update stage
        opportunity.stage = new_stage

        # Handle closed stages
        if new_stage == OpportunityStage.CLOSED_WON:
            opportunity.actual_close_date = date.today()
            opportunity.probability = Decimal("100.00")
        elif new_stage == OpportunityStage.CLOSED_LOST:
            if not loss_reason:
                raise ValidationError("Loss reason is required when closing as lost")
            opportunity.actual_close_date = date.today()
            opportunity.probability = Decimal("0.00")
            opportunity.loss_reason = loss_reason

        self.db.commit()
        self.db.refresh(opportunity)

        return opportunity

    async def delete_opportunity(
        self,
        opportunity_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """
        Soft delete an opportunity

        Args:
            opportunity_id: Opportunity UUID
            tenant_id: Tenant UUID

        Returns:
            True if deleted successfully

        Raises:
            NotFoundError: If opportunity not found
        """
        opportunity = await self.get_opportunity_by_id(opportunity_id, tenant_id)
        opportunity.soft_delete()
        self.db.commit()
        return True

    async def get_pipeline_summary(
        self,
        tenant_id: UUID,
        assigned_to: Optional[UUID] = None
    ) -> PipelineSummary:
        """
        Get pipeline summary with statistics

        Args:
            tenant_id: Tenant UUID
            assigned_to: Optional filter by assigned user

        Returns:
            PipelineSummary with aggregated statistics
        """
        # Build base query
        base_filter = and_(
            Opportunity.tenant_id == tenant_id,
            Opportunity.is_deleted == False
        )

        if assigned_to:
            base_filter = and_(base_filter, Opportunity.assigned_to == assigned_to)

        # Get all opportunities for calculation
        query = select(Opportunity).where(base_filter)
        result = self.db.execute(query)
        opportunities = result.scalars().all()

        # Calculate statistics
        total_opportunities = len(opportunities)
        total_value = sum(
            float(opp.estimated_value) for opp in opportunities
        )
        weighted_value = sum(opp.weighted_value for opp in opportunities)

        # Calculate by stage
        by_stage = {}
        for stage in OpportunityStage:
            stage_opps = [opp for opp in opportunities if opp.stage == stage]
            if stage_opps:
                stage_value = sum(float(opp.estimated_value) for opp in stage_opps)
                stage_weighted = sum(opp.weighted_value for opp in stage_opps)
                avg_probability = sum(
                    float(opp.probability) for opp in stage_opps
                ) / len(stage_opps)

                by_stage[stage.value] = PipelineStageStats(
                    count=len(stage_opps),
                    total_value=Decimal(str(stage_value)),
                    weighted_value=Decimal(str(stage_weighted)),
                    average_probability=Decimal(str(avg_probability))
                )

        # Calculate win rate
        closed_opps = [
            opp for opp in opportunities
            if opp.stage in [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]
        ]
        won_opps = [opp for opp in opportunities if opp.stage == OpportunityStage.CLOSED_WON]
        lost_opps = [opp for opp in opportunities if opp.stage == OpportunityStage.CLOSED_LOST]

        win_rate = Decimal("0.00")
        if closed_opps:
            win_rate = Decimal(str((len(won_opps) / len(closed_opps)) * 100))

        # Calculate average deal size
        average_deal_size = Decimal("0.00")
        if total_opportunities > 0:
            average_deal_size = Decimal(str(total_value / total_opportunities))

        # Count active opportunities (not closed)
        active_opportunities = len([
            opp for opp in opportunities
            if opp.stage not in [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]
        ])

        return PipelineSummary(
            total_opportunities=total_opportunities,
            total_value=Decimal(str(total_value)),
            weighted_value=Decimal(str(weighted_value)),
            by_stage=by_stage,
            win_rate=win_rate,
            average_deal_size=average_deal_size,
            total_won=len(won_opps),
            total_lost=len(lost_opps),
            active_opportunities=active_opportunities
        )

    async def get_opportunities_by_stage(
        self,
        tenant_id: UUID,
        stage: OpportunityStage,
        assigned_to: Optional[UUID] = None
    ) -> list[Opportunity]:
        """
        Get all opportunities in a specific stage

        Args:
            tenant_id: Tenant UUID
            stage: Pipeline stage
            assigned_to: Optional filter by assigned user

        Returns:
            List of opportunities
        """
        query = (
            select(Opportunity)
            .options(
                joinedload(Opportunity.client),
                joinedload(Opportunity.sales_rep)
            )
            .where(
                and_(
                    Opportunity.tenant_id == tenant_id,
                    Opportunity.stage == stage,
                    Opportunity.is_deleted == False
                )
            )
        )

        if assigned_to:
            query = query.where(Opportunity.assigned_to == assigned_to)

        query = query.order_by(Opportunity.created_at.desc())

        result = self.db.execute(query)
        return result.scalars().all()

    async def get_overdue_opportunities(
        self,
        tenant_id: UUID
    ) -> list[Opportunity]:
        """
        Get opportunities with past expected close dates that are still open

        Args:
            tenant_id: Tenant UUID

        Returns:
            List of overdue opportunities
        """
        query = (
            select(Opportunity)
            .options(
                joinedload(Opportunity.client),
                joinedload(Opportunity.sales_rep)
            )
            .where(
                and_(
                    Opportunity.tenant_id == tenant_id,
                    Opportunity.is_deleted == False,
                    Opportunity.expected_close_date < date.today(),
                    Opportunity.stage.notin_([
                        OpportunityStage.CLOSED_WON,
                        OpportunityStage.CLOSED_LOST
                    ])
                )
            )
            .order_by(Opportunity.expected_close_date.asc())
        )

        result = self.db.execute(query)
        return result.scalars().all()

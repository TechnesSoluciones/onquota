"""
Repository for Account Planner CRUD operations and business logic
"""
from typing import Optional, Tuple, List
from uuid import UUID
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError

from modules.accounts.models import AccountPlan, Milestone, SWOTItem, PlanStatus, MilestoneStatus, SWOTCategory
from modules.accounts.schemas import (
    AccountPlanCreate,
    AccountPlanUpdate,
    MilestoneCreate,
    MilestoneUpdate,
    SWOTItemCreate,
    AccountPlanStats,
    MilestoneStats,
    SWOTStats
)
from models.client import Client
from models.user import User
from core.exceptions import NotFoundError, ValidationError


class AccountPlanRepository:
    """Repository for managing account plans, milestones, and SWOT items"""

    def __init__(self, db: Session):
        self.db = db

    # ========================================================================
    # Account Plan CRUD Operations
    # ========================================================================

    async def create_plan(
        self,
        data: AccountPlanCreate,
        tenant_id: UUID,
        created_by: UUID
    ) -> AccountPlan:
        """
        Create a new account plan

        Args:
            data: Account plan creation data
            tenant_id: Tenant UUID
            created_by: User UUID who creates the plan

        Returns:
            Created AccountPlan instance

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
                    User.id == created_by,
                    User.tenant_id == tenant_id,
                    User.is_deleted == False
                )
            )
        ).scalar_one_or_none()

        if not user:
            raise ValidationError("User not found or doesn't belong to your organization")

        # Create account plan
        plan = AccountPlan(
            tenant_id=tenant_id,
            title=data.title,
            description=data.description,
            client_id=data.client_id,
            created_by=created_by,
            status=data.status,
            start_date=data.start_date,
            end_date=data.end_date,
            revenue_goal=data.revenue_goal
        )

        self.db.add(plan)
        self.db.commit()
        self.db.refresh(plan)

        return plan

    async def get_plan(
        self,
        plan_id: UUID,
        tenant_id: UUID
    ) -> AccountPlan:
        """
        Get account plan by ID

        Args:
            plan_id: Plan UUID
            tenant_id: Tenant UUID

        Returns:
            AccountPlan instance

        Raises:
            NotFoundError: If plan not found
        """
        query = (
            select(AccountPlan)
            .options(
                joinedload(AccountPlan.client),
                joinedload(AccountPlan.creator)
            )
            .where(
                and_(
                    AccountPlan.id == plan_id,
                    AccountPlan.tenant_id == tenant_id,
                    AccountPlan.is_deleted == False
                )
            )
        )

        result = self.db.execute(query)
        plan = result.scalar_one_or_none()

        if not plan:
            raise NotFoundError("AccountPlan", plan_id)

        return plan

    async def get_plan_with_details(
        self,
        plan_id: UUID,
        tenant_id: UUID
    ) -> AccountPlan:
        """
        Get account plan with milestones and SWOT items

        Args:
            plan_id: Plan UUID
            tenant_id: Tenant UUID

        Returns:
            AccountPlan instance with related data

        Raises:
            NotFoundError: If plan not found
        """
        query = (
            select(AccountPlan)
            .options(
                joinedload(AccountPlan.client),
                joinedload(AccountPlan.creator),
                joinedload(AccountPlan.milestones),
                joinedload(AccountPlan.swot_items)
            )
            .where(
                and_(
                    AccountPlan.id == plan_id,
                    AccountPlan.tenant_id == tenant_id,
                    AccountPlan.is_deleted == False
                )
            )
        )

        result = self.db.execute(query)
        plan = result.scalar_one_or_none()

        if not plan:
            raise NotFoundError("AccountPlan", plan_id)

        return plan

    async def list_plans(
        self,
        tenant_id: UUID,
        client_id: Optional[UUID] = None,
        status: Optional[PlanStatus] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[AccountPlan], int]:
        """
        Get paginated list of account plans with filters

        Args:
            tenant_id: Tenant UUID
            client_id: Optional filter by client
            status: Optional filter by status
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (plans list, total count)
        """
        # Build base query
        query = (
            select(AccountPlan)
            .options(
                joinedload(AccountPlan.client),
                joinedload(AccountPlan.creator)
            )
            .where(
                and_(
                    AccountPlan.tenant_id == tenant_id,
                    AccountPlan.is_deleted == False
                )
            )
        )

        # Apply filters
        if client_id:
            query = query.where(AccountPlan.client_id == client_id)
        if status:
            query = query.where(AccountPlan.status == status)

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.execute(count_query).scalar()

        # Apply pagination and ordering
        query = query.order_by(AccountPlan.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        # Execute query
        result = self.db.execute(query)
        plans = result.scalars().all()

        return plans, total

    async def update_plan(
        self,
        plan_id: UUID,
        tenant_id: UUID,
        data: AccountPlanUpdate
    ) -> AccountPlan:
        """
        Update an account plan

        Args:
            plan_id: Plan UUID
            tenant_id: Tenant UUID
            data: Update data

        Returns:
            Updated AccountPlan instance

        Raises:
            NotFoundError: If plan not found
            ValidationError: If validation fails
        """
        plan = await self.get_plan(plan_id, tenant_id)

        # Update fields
        update_data = data.model_dump(exclude_unset=True)

        # Validate end_date if being updated
        if 'end_date' in update_data and update_data['end_date']:
            start_date = update_data.get('start_date', plan.start_date)
            if update_data['end_date'] <= start_date:
                raise ValidationError("end_date must be after start_date")

        for field, value in update_data.items():
            setattr(plan, field, value)

        self.db.commit()
        self.db.refresh(plan)

        return plan

    async def delete_plan(
        self,
        plan_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """
        Soft delete an account plan

        Args:
            plan_id: Plan UUID
            tenant_id: Tenant UUID

        Returns:
            True if deleted successfully

        Raises:
            NotFoundError: If plan not found
            ValidationError: If plan has completed milestones
        """
        plan = await self.get_plan_with_details(plan_id, tenant_id)

        # Check if plan has completed milestones
        completed_milestones = [
            m for m in plan.milestones
            if m.status == MilestoneStatus.COMPLETED
        ]

        if completed_milestones:
            raise ValidationError(
                "Cannot delete plan with completed milestones. "
                "Please cancel the plan instead."
            )

        plan.soft_delete()
        self.db.commit()
        return True

    async def get_plans_by_client(
        self,
        client_id: UUID,
        tenant_id: UUID
    ) -> List[AccountPlan]:
        """
        Get all plans for a specific client

        Args:
            client_id: Client UUID
            tenant_id: Tenant UUID

        Returns:
            List of AccountPlan instances
        """
        query = (
            select(AccountPlan)
            .options(
                joinedload(AccountPlan.creator)
            )
            .where(
                and_(
                    AccountPlan.client_id == client_id,
                    AccountPlan.tenant_id == tenant_id,
                    AccountPlan.is_deleted == False
                )
            )
            .order_by(AccountPlan.created_at.desc())
        )

        result = self.db.execute(query)
        return result.scalars().all()

    # ========================================================================
    # Milestone CRUD Operations
    # ========================================================================

    async def create_milestone(
        self,
        plan_id: UUID,
        tenant_id: UUID,
        data: MilestoneCreate
    ) -> Milestone:
        """
        Create a new milestone for an account plan

        Args:
            plan_id: Plan UUID
            tenant_id: Tenant UUID
            data: Milestone creation data

        Returns:
            Created Milestone instance

        Raises:
            NotFoundError: If plan not found
            ValidationError: If due_date is outside plan dates
        """
        # Get plan to validate
        plan = await self.get_plan(plan_id, tenant_id)

        # Validate due_date is within plan dates
        if data.due_date < plan.start_date:
            raise ValidationError(
                f"Milestone due_date must be on or after plan start_date ({plan.start_date})"
            )

        if plan.end_date and data.due_date > plan.end_date:
            raise ValidationError(
                f"Milestone due_date must be on or before plan end_date ({plan.end_date})"
            )

        # Create milestone
        milestone = Milestone(
            tenant_id=tenant_id,
            plan_id=plan_id,
            title=data.title,
            description=data.description,
            due_date=data.due_date,
            status=data.status
        )

        self.db.add(milestone)
        self.db.commit()
        self.db.refresh(milestone)

        return milestone

    async def get_milestone(
        self,
        milestone_id: UUID,
        tenant_id: UUID
    ) -> Milestone:
        """
        Get milestone by ID

        Args:
            milestone_id: Milestone UUID
            tenant_id: Tenant UUID

        Returns:
            Milestone instance

        Raises:
            NotFoundError: If milestone not found
        """
        query = (
            select(Milestone)
            .where(
                and_(
                    Milestone.id == milestone_id,
                    Milestone.tenant_id == tenant_id,
                    Milestone.is_deleted == False
                )
            )
        )

        result = self.db.execute(query)
        milestone = result.scalar_one_or_none()

        if not milestone:
            raise NotFoundError("Milestone", milestone_id)

        return milestone

    async def update_milestone(
        self,
        milestone_id: UUID,
        tenant_id: UUID,
        data: MilestoneUpdate
    ) -> Milestone:
        """
        Update a milestone

        Args:
            milestone_id: Milestone UUID
            tenant_id: Tenant UUID
            data: Update data

        Returns:
            Updated Milestone instance

        Raises:
            NotFoundError: If milestone not found
        """
        milestone = await self.get_milestone(milestone_id, tenant_id)

        # Update fields
        update_data = data.model_dump(exclude_unset=True)

        # Auto-set completion_date when marking as completed
        if 'status' in update_data:
            if update_data['status'] == MilestoneStatus.COMPLETED and not milestone.completion_date:
                update_data['completion_date'] = date.today()
            elif update_data['status'] != MilestoneStatus.COMPLETED:
                update_data['completion_date'] = None

        for field, value in update_data.items():
            setattr(milestone, field, value)

        self.db.commit()
        self.db.refresh(milestone)

        return milestone

    async def delete_milestone(
        self,
        milestone_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """
        Soft delete a milestone

        Args:
            milestone_id: Milestone UUID
            tenant_id: Tenant UUID

        Returns:
            True if deleted successfully

        Raises:
            NotFoundError: If milestone not found
        """
        milestone = await self.get_milestone(milestone_id, tenant_id)
        milestone.soft_delete()
        self.db.commit()
        return True

    # ========================================================================
    # SWOT Item CRUD Operations
    # ========================================================================

    async def create_swot_item(
        self,
        plan_id: UUID,
        tenant_id: UUID,
        data: SWOTItemCreate
    ) -> SWOTItem:
        """
        Create a new SWOT item for an account plan

        Args:
            plan_id: Plan UUID
            tenant_id: Tenant UUID
            data: SWOT item creation data

        Returns:
            Created SWOTItem instance

        Raises:
            NotFoundError: If plan not found
        """
        # Verify plan exists
        await self.get_plan(plan_id, tenant_id)

        # Create SWOT item
        swot_item = SWOTItem(
            tenant_id=tenant_id,
            plan_id=plan_id,
            category=data.category,
            description=data.description
        )

        self.db.add(swot_item)
        self.db.commit()
        self.db.refresh(swot_item)

        return swot_item

    async def get_swot_item(
        self,
        swot_id: UUID,
        tenant_id: UUID
    ) -> SWOTItem:
        """
        Get SWOT item by ID

        Args:
            swot_id: SWOT item UUID
            tenant_id: Tenant UUID

        Returns:
            SWOTItem instance

        Raises:
            NotFoundError: If SWOT item not found
        """
        query = (
            select(SWOTItem)
            .where(
                and_(
                    SWOTItem.id == swot_id,
                    SWOTItem.tenant_id == tenant_id,
                    SWOTItem.is_deleted == False
                )
            )
        )

        result = self.db.execute(query)
        swot_item = result.scalar_one_or_none()

        if not swot_item:
            raise NotFoundError("SWOTItem", swot_id)

        return swot_item

    async def delete_swot_item(
        self,
        swot_id: UUID,
        tenant_id: UUID
    ) -> bool:
        """
        Soft delete a SWOT item

        Args:
            swot_id: SWOT item UUID
            tenant_id: Tenant UUID

        Returns:
            True if deleted successfully

        Raises:
            NotFoundError: If SWOT item not found
        """
        swot_item = await self.get_swot_item(swot_id, tenant_id)
        swot_item.soft_delete()
        self.db.commit()
        return True

    # ========================================================================
    # Statistics and Analytics
    # ========================================================================

    async def get_plan_stats(
        self,
        plan_id: UUID,
        tenant_id: UUID
    ) -> AccountPlanStats:
        """
        Get comprehensive statistics for an account plan

        Args:
            plan_id: Plan UUID
            tenant_id: Tenant UUID

        Returns:
            AccountPlanStats with aggregated data

        Raises:
            NotFoundError: If plan not found
        """
        plan = await self.get_plan_with_details(plan_id, tenant_id)

        # Calculate milestone statistics
        milestones = plan.milestones
        total_milestones = len(milestones)

        pending = len([m for m in milestones if m.status == MilestoneStatus.PENDING])
        in_progress = len([m for m in milestones if m.status == MilestoneStatus.IN_PROGRESS])
        completed = len([m for m in milestones if m.status == MilestoneStatus.COMPLETED])
        cancelled = len([m for m in milestones if m.status == MilestoneStatus.CANCELLED])
        overdue = len([m for m in milestones if m.is_overdue])

        completion_rate = 0.0
        if total_milestones > 0:
            completion_rate = (completed / total_milestones) * 100

        milestone_stats = MilestoneStats(
            total=total_milestones,
            pending=pending,
            in_progress=in_progress,
            completed=completed,
            cancelled=cancelled,
            overdue=overdue,
            completion_rate=completion_rate
        )

        # Calculate SWOT statistics
        swot_items = plan.swot_items
        strengths = len([s for s in swot_items if s.category == SWOTCategory.STRENGTH])
        weaknesses = len([s for s in swot_items if s.category == SWOTCategory.WEAKNESS])
        opportunities = len([s for s in swot_items if s.category == SWOTCategory.OPPORTUNITY])
        threats = len([s for s in swot_items if s.category == SWOTCategory.THREAT])

        swot_stats = SWOTStats(
            strengths_count=strengths,
            weaknesses_count=weaknesses,
            opportunities_count=opportunities,
            threats_count=threats,
            total_items=len(swot_items)
        )

        # Calculate days remaining
        days_remaining = None
        if plan.end_date:
            delta = plan.end_date - date.today()
            days_remaining = delta.days if delta.days >= 0 else 0

        return AccountPlanStats(
            plan_id=plan.id,
            title=plan.title,
            status=plan.status,
            progress_percentage=plan.progress_percentage,
            milestones=milestone_stats,
            swot=swot_stats,
            days_remaining=days_remaining,
            revenue_goal=plan.revenue_goal
        )

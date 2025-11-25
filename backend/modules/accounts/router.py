"""
Account Planner endpoints
Handles strategic account planning, milestones, and SWOT analysis
"""
import math
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import NotFoundError, ValidationError, ForbiddenError
from models.user import User, UserRole
from modules.accounts.models import PlanStatus, MilestoneStatus, SWOTCategory
from modules.accounts.schemas import (
    AccountPlanCreate,
    AccountPlanUpdate,
    AccountPlanResponse,
    AccountPlanDetail,
    AccountPlanListResponse,
    AccountPlanStats,
    MilestoneCreate,
    MilestoneUpdate,
    MilestoneResponse,
    SWOTItemCreate,
    SWOTItemResponse
)
from modules.accounts.repository import AccountPlanRepository
from api.dependencies import get_current_user, require_role


router = APIRouter(prefix="/accounts", tags=["Account Planner"])


# ============================================================================
# Helper Functions
# ============================================================================


def can_modify_plan(user: User) -> bool:
    """Check if user can create/edit account plans"""
    return user.role in [UserRole.ADMIN, UserRole.SALES_REP]


def is_read_only_user(user: User) -> bool:
    """Check if user has read-only access"""
    return user.role in [UserRole.SUPERVISOR, UserRole.ANALYST]


# ============================================================================
# Account Plan Endpoints
# ============================================================================


@router.post(
    "/plans",
    response_model=AccountPlanResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_plan(
    data: AccountPlanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create new account plan

    Creates a strategic account plan for a client with goals and timeline.

    **Features:**
    - Links to existing client
    - Sets revenue goals and timeline
    - Tracks plan status (draft, active, completed, cancelled)
    - Associates with creator user

    **Validations:**
    - Client must exist and belong to tenant
    - end_date must be after start_date
    - revenue_goal must be positive if provided
    - Maximum 2 decimal places for revenue_goal

    **Access Control:**
    - Admin and SalesRep can create plans
    - Supervisor and Analyst have read-only access

    **Required Role:** Admin or SalesRep
    """
    if not can_modify_plan(current_user):
        raise ForbiddenError(
            "Only Admin and SalesRep users can create account plans. "
            "Supervisor and Analyst users have read-only access."
        )

    repo = AccountPlanRepository(db)

    plan = await repo.create_plan(
        data=data,
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
    )

    # Build response with related data
    return AccountPlanResponse(
        id=plan.id,
        tenant_id=plan.tenant_id,
        title=plan.title,
        description=plan.description,
        client_id=plan.client_id,
        client_name=plan.client.name,
        created_by=plan.created_by,
        creator_name=plan.creator.full_name,
        status=plan.status,
        start_date=plan.start_date,
        end_date=plan.end_date,
        revenue_goal=plan.revenue_goal,
        milestones_count=plan.milestones_count,
        completed_milestones_count=plan.completed_milestones_count,
        progress_percentage=plan.progress_percentage,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.get("/plans", response_model=AccountPlanListResponse)
async def list_plans(
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    status: Optional[PlanStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List account plans with filters and pagination

    Returns paginated list of account plans with optional filters.

    **Filters:**
    - `client_id`: Filter by specific client
    - `status`: Filter by plan status (draft, active, completed, cancelled)

    **Pagination:**
    - `page`: Page number (starts at 1)
    - `page_size`: Items per page (1-100)

    **Access Control:**
    - All authenticated users can view plans
    - Plans are scoped to tenant

    **Response includes:**
    - Plan details
    - Client name
    - Creator name
    - Progress metrics (milestones count, completion percentage)
    """
    repo = AccountPlanRepository(db)

    plans, total = await repo.list_plans(
        tenant_id=current_user.tenant_id,
        client_id=client_id,
        status=status,
        page=page,
        page_size=page_size,
    )

    # Build response items
    items = []
    for plan in plans:
        items.append(
            AccountPlanResponse(
                id=plan.id,
                tenant_id=plan.tenant_id,
                title=plan.title,
                description=plan.description,
                client_id=plan.client_id,
                client_name=plan.client.name,
                created_by=plan.created_by,
                creator_name=plan.creator.full_name,
                status=plan.status,
                start_date=plan.start_date,
                end_date=plan.end_date,
                revenue_goal=plan.revenue_goal,
                milestones_count=plan.milestones_count,
                completed_milestones_count=plan.completed_milestones_count,
                progress_percentage=plan.progress_percentage,
                created_at=plan.created_at,
                updated_at=plan.updated_at,
            )
        )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return AccountPlanListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/plans/{plan_id}", response_model=AccountPlanDetail)
async def get_plan(
    plan_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get account plan with full details

    Returns detailed account plan information including all milestones and SWOT items.

    **Access Control:**
    - All authenticated users can view plans
    - Plans are scoped to tenant

    **Response includes:**
    - Full plan details
    - Client information
    - Creator information
    - All milestones with status
    - All SWOT analysis items
    - Progress metrics
    """
    repo = AccountPlanRepository(db)

    plan = await repo.get_plan_with_details(
        plan_id=plan_id,
        tenant_id=current_user.tenant_id,
    )

    # Build milestone responses
    milestones = []
    for milestone in plan.milestones:
        if not milestone.is_deleted:
            milestones.append(
                MilestoneResponse(
                    id=milestone.id,
                    tenant_id=milestone.tenant_id,
                    plan_id=milestone.plan_id,
                    title=milestone.title,
                    description=milestone.description,
                    due_date=milestone.due_date,
                    completion_date=milestone.completion_date,
                    status=milestone.status,
                    is_completed=milestone.is_completed,
                    is_overdue=milestone.is_overdue,
                    created_at=milestone.created_at,
                    updated_at=milestone.updated_at,
                )
            )

    # Build SWOT item responses
    swot_items = []
    for swot in plan.swot_items:
        if not swot.is_deleted:
            swot_items.append(
                SWOTItemResponse(
                    id=swot.id,
                    tenant_id=swot.tenant_id,
                    plan_id=swot.plan_id,
                    category=swot.category,
                    description=swot.description,
                    created_at=swot.created_at,
                )
            )

    return AccountPlanDetail(
        id=plan.id,
        tenant_id=plan.tenant_id,
        title=plan.title,
        description=plan.description,
        client_id=plan.client_id,
        client_name=plan.client.name,
        created_by=plan.created_by,
        creator_name=plan.creator.full_name,
        status=plan.status,
        start_date=plan.start_date,
        end_date=plan.end_date,
        revenue_goal=plan.revenue_goal,
        milestones=milestones,
        swot_items=swot_items,
        milestones_count=plan.milestones_count,
        completed_milestones_count=plan.completed_milestones_count,
        progress_percentage=plan.progress_percentage,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.put("/plans/{plan_id}", response_model=AccountPlanResponse)
async def update_plan(
    plan_id: UUID,
    data: AccountPlanUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update account plan

    Updates an existing account plan.

    **Business Rules:**
    - end_date must be after start_date if provided
    - revenue_goal must be positive if provided
    - Maximum 2 decimal places for revenue_goal

    **Access Control:**
    - Admin and SalesRep can update plans
    - Supervisor and Analyst have read-only access

    **Updatable fields:**
    - title, description
    - start_date, end_date
    - revenue_goal
    - status

    **Required Role:** Admin or SalesRep
    """
    if not can_modify_plan(current_user):
        raise ForbiddenError(
            "Only Admin and SalesRep users can update account plans. "
            "Supervisor and Analyst users have read-only access."
        )

    repo = AccountPlanRepository(db)

    # Verify plan exists and belongs to tenant
    await repo.get_plan(plan_id, current_user.tenant_id)

    # Update plan
    updated_plan = await repo.update_plan(
        plan_id=plan_id,
        tenant_id=current_user.tenant_id,
        data=data,
    )

    return AccountPlanResponse(
        id=updated_plan.id,
        tenant_id=updated_plan.tenant_id,
        title=updated_plan.title,
        description=updated_plan.description,
        client_id=updated_plan.client_id,
        client_name=updated_plan.client.name,
        created_by=updated_plan.created_by,
        creator_name=updated_plan.creator.full_name,
        status=updated_plan.status,
        start_date=updated_plan.start_date,
        end_date=updated_plan.end_date,
        revenue_goal=updated_plan.revenue_goal,
        milestones_count=updated_plan.milestones_count,
        completed_milestones_count=updated_plan.completed_milestones_count,
        progress_percentage=updated_plan.progress_percentage,
        created_at=updated_plan.created_at,
        updated_at=updated_plan.updated_at,
    )


@router.delete("/plans/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete account plan

    Soft deletes an account plan.

    **Business Rules:**
    - Cannot delete plans with completed milestones
    - Use cancel status instead if plan has completed work

    **Access Control:**
    - Admin and SalesRep can delete plans
    - Supervisor and Analyst have read-only access

    **Note:** This is a soft delete. The plan is marked as deleted
    but remains in the database for audit purposes.

    **Required Role:** Admin or SalesRep
    """
    if not can_modify_plan(current_user):
        raise ForbiddenError(
            "Only Admin and SalesRep users can delete account plans. "
            "Supervisor and Analyst users have read-only access."
        )

    repo = AccountPlanRepository(db)

    await repo.delete_plan(
        plan_id=plan_id,
        tenant_id=current_user.tenant_id,
    )

    return None


@router.get("/plans/{plan_id}/stats", response_model=AccountPlanStats)
async def get_plan_stats(
    plan_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get account plan statistics

    Returns comprehensive statistics and analytics for an account plan.

    **Statistics include:**
    - Overall progress percentage
    - Milestone breakdown by status
    - Completion rate
    - Overdue milestones count
    - SWOT items breakdown by category
    - Days remaining until plan end date
    - Revenue goal

    **Access Control:**
    - All authenticated users can view plan statistics
    - Plans are scoped to tenant

    **Use Cases:**
    - Dashboard KPIs
    - Progress tracking
    - Plan health monitoring
    - Executive reporting
    """
    repo = AccountPlanRepository(db)

    stats = await repo.get_plan_stats(
        plan_id=plan_id,
        tenant_id=current_user.tenant_id,
    )

    return stats


# ============================================================================
# Milestone Endpoints
# ============================================================================


@router.post(
    "/plans/{plan_id}/milestones",
    response_model=MilestoneResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_milestone(
    plan_id: UUID,
    data: MilestoneCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create milestone for account plan

    Creates a new milestone/deliverable within an account plan.

    **Features:**
    - Links to existing account plan
    - Sets due date and status
    - Tracks completion

    **Validations:**
    - Plan must exist and belong to tenant
    - due_date must be within plan start_date and end_date range
    - due_date must be on or after plan start_date
    - due_date must be on or before plan end_date (if set)

    **Access Control:**
    - Admin and SalesRep can create milestones
    - Supervisor and Analyst have read-only access

    **Required Role:** Admin or SalesRep
    """
    if not can_modify_plan(current_user):
        raise ForbiddenError(
            "Only Admin and SalesRep users can create milestones. "
            "Supervisor and Analyst users have read-only access."
        )

    repo = AccountPlanRepository(db)

    milestone = await repo.create_milestone(
        plan_id=plan_id,
        tenant_id=current_user.tenant_id,
        data=data,
    )

    return MilestoneResponse(
        id=milestone.id,
        tenant_id=milestone.tenant_id,
        plan_id=milestone.plan_id,
        title=milestone.title,
        description=milestone.description,
        due_date=milestone.due_date,
        completion_date=milestone.completion_date,
        status=milestone.status,
        is_completed=milestone.is_completed,
        is_overdue=milestone.is_overdue,
        created_at=milestone.created_at,
        updated_at=milestone.updated_at,
    )


@router.put("/milestones/{milestone_id}", response_model=MilestoneResponse)
async def update_milestone(
    milestone_id: UUID,
    data: MilestoneUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update milestone

    Updates an existing milestone.

    **Business Rules:**
    - Auto-sets completion_date when marking as completed
    - Clears completion_date when changing from completed to other status

    **Access Control:**
    - Admin and SalesRep can update milestones
    - Supervisor and Analyst have read-only access

    **Updatable fields:**
    - title, description
    - due_date
    - status
    - completion_date

    **Required Role:** Admin or SalesRep
    """
    if not can_modify_plan(current_user):
        raise ForbiddenError(
            "Only Admin and SalesRep users can update milestones. "
            "Supervisor and Analyst users have read-only access."
        )

    repo = AccountPlanRepository(db)

    # Verify milestone exists and belongs to tenant
    await repo.get_milestone(milestone_id, current_user.tenant_id)

    # Update milestone
    updated_milestone = await repo.update_milestone(
        milestone_id=milestone_id,
        tenant_id=current_user.tenant_id,
        data=data,
    )

    return MilestoneResponse(
        id=updated_milestone.id,
        tenant_id=updated_milestone.tenant_id,
        plan_id=updated_milestone.plan_id,
        title=updated_milestone.title,
        description=updated_milestone.description,
        due_date=updated_milestone.due_date,
        completion_date=updated_milestone.completion_date,
        status=updated_milestone.status,
        is_completed=updated_milestone.is_completed,
        is_overdue=updated_milestone.is_overdue,
        created_at=updated_milestone.created_at,
        updated_at=updated_milestone.updated_at,
    )


@router.delete("/milestones/{milestone_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_milestone(
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete milestone

    Soft deletes a milestone.

    **Access Control:**
    - Admin and SalesRep can delete milestones
    - Supervisor and Analyst have read-only access

    **Note:** This is a soft delete. The milestone is marked as deleted
    but remains in the database for audit purposes.

    **Required Role:** Admin or SalesRep
    """
    if not can_modify_plan(current_user):
        raise ForbiddenError(
            "Only Admin and SalesRep users can delete milestones. "
            "Supervisor and Analyst users have read-only access."
        )

    repo = AccountPlanRepository(db)

    await repo.delete_milestone(
        milestone_id=milestone_id,
        tenant_id=current_user.tenant_id,
    )

    return None


# ============================================================================
# SWOT Item Endpoints
# ============================================================================


@router.post(
    "/plans/{plan_id}/swot",
    response_model=SWOTItemResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_swot_item(
    plan_id: UUID,
    data: SWOTItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create SWOT analysis item for account plan

    Creates a new item in the SWOT (Strengths, Weaknesses, Opportunities, Threats)
    analysis for an account plan.

    **SWOT Categories:**
    - **Strength**: Internal positive attributes
    - **Weakness**: Internal negative attributes
    - **Opportunity**: External positive factors
    - **Threat**: External negative factors

    **Features:**
    - Links to existing account plan
    - Categorizes strategic insights
    - Supports comprehensive account analysis

    **Validations:**
    - Plan must exist and belong to tenant
    - Category must be valid SWOT category
    - Description is required

    **Access Control:**
    - Admin and SalesRep can create SWOT items
    - Supervisor and Analyst have read-only access

    **Required Role:** Admin or SalesRep
    """
    if not can_modify_plan(current_user):
        raise ForbiddenError(
            "Only Admin and SalesRep users can create SWOT items. "
            "Supervisor and Analyst users have read-only access."
        )

    repo = AccountPlanRepository(db)

    swot_item = await repo.create_swot_item(
        plan_id=plan_id,
        tenant_id=current_user.tenant_id,
        data=data,
    )

    return SWOTItemResponse(
        id=swot_item.id,
        tenant_id=swot_item.tenant_id,
        plan_id=swot_item.plan_id,
        category=swot_item.category,
        description=swot_item.description,
        created_at=swot_item.created_at,
    )


@router.delete("/swot/{swot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_swot_item(
    swot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete SWOT analysis item

    Soft deletes a SWOT item.

    **Access Control:**
    - Admin and SalesRep can delete SWOT items
    - Supervisor and Analyst have read-only access

    **Note:** This is a soft delete. The SWOT item is marked as deleted
    but remains in the database for audit purposes.

    **Required Role:** Admin or SalesRep
    """
    if not can_modify_plan(current_user):
        raise ForbiddenError(
            "Only Admin and SalesRep users can delete SWOT items. "
            "Supervisor and Analyst users have read-only access."
        )

    repo = AccountPlanRepository(db)

    await repo.delete_swot_item(
        swot_id=swot_id,
        tenant_id=current_user.tenant_id,
    )

    return None

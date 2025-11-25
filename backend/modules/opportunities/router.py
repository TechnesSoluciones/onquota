"""
Opportunities endpoints
Handles sales pipeline management, opportunity tracking, and pipeline analytics
"""
import math
from datetime import date
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from core.database import get_db
from core.exceptions import NotFoundError, ValidationError, ForbiddenError
from models.user import User, UserRole
from modules.opportunities.models import OpportunityStage
from modules.opportunities.schemas import (
    OpportunityCreate,
    OpportunityUpdate,
    OpportunityResponse,
    OpportunityListResponse,
    OpportunityStageUpdate,
    PipelineSummary,
    PipelineBoardResponse,
    PipelineBoardColumn,
    PipelineBoardCard,
)
from modules.opportunities.repository import OpportunityRepository
from api.dependencies import get_current_user, require_admin


router = APIRouter(prefix="/opportunities", tags=["Opportunities"])


# ============================================================================
# Opportunity CRUD Endpoints
# ============================================================================


@router.post(
    "",
    response_model=OpportunityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_opportunity(
    data: OpportunityCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create new opportunity

    Creates a new sales opportunity in the pipeline.

    **Features:**
    - Links to existing client
    - Auto-assigns to current user or specified sales rep
    - Calculates weighted value automatically (value * probability)
    - Sets initial stage (default: LEAD)

    **Validations:**
    - Client must exist and belong to tenant
    - User must exist and belong to tenant
    - Estimated value must be positive
    - Probability must be 0-100
    - Expected close date must be in future

    **Access Control:**
    - Any authenticated user can create opportunities
    - Opportunity is assigned to current user by default
    """
    repo = OpportunityRepository(db)

    opportunity = await repo.create_opportunity(
        data=data,
        tenant_id=current_user.tenant_id,
        assigned_to=current_user.id,
    )

    # Build response with related data
    return OpportunityResponse(
        id=opportunity.id,
        tenant_id=opportunity.tenant_id,
        name=opportunity.name,
        description=opportunity.description,
        client_id=opportunity.client_id,
        client_name=opportunity.client.name,
        assigned_to=opportunity.assigned_to,
        sales_rep_name=opportunity.sales_rep.full_name,
        estimated_value=opportunity.estimated_value,
        currency=opportunity.currency,
        probability=opportunity.probability,
        expected_close_date=opportunity.expected_close_date,
        actual_close_date=opportunity.actual_close_date,
        stage=opportunity.stage,
        loss_reason=opportunity.loss_reason,
        weighted_value=opportunity.weighted_value,
        is_closed=opportunity.is_closed,
        is_won=opportunity.is_won,
        created_at=opportunity.created_at,
        updated_at=opportunity.updated_at,
    )


@router.get("", response_model=OpportunityListResponse)
async def list_opportunities(
    stage: Optional[OpportunityStage] = Query(None, description="Filter by stage"),
    assigned_to: Optional[UUID] = Query(None, description="Filter by assigned user"),
    client_id: Optional[UUID] = Query(None, description="Filter by client"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List opportunities with filters and pagination

    Returns paginated list of opportunities with optional filters.

    **Filters:**
    - `stage`: Filter by pipeline stage
    - `assigned_to`: Filter by assigned sales rep
    - `client_id`: Filter by client

    **Pagination:**
    - `page`: Page number (starts at 1)
    - `page_size`: Items per page (1-100)

    **Access Control:**
    - Sales reps see only their own opportunities
    - Supervisors and admins see all opportunities in tenant

    **Response includes:**
    - Opportunity details
    - Client name
    - Sales rep name
    - Weighted value calculation
    """
    repo = OpportunityRepository(db)

    # Apply RBAC: sales reps see only their opportunities
    user_filter = None
    if current_user.role == UserRole.SALES_REP:
        user_filter = current_user.id
    elif assigned_to:
        user_filter = assigned_to

    opportunities, total = await repo.get_opportunities(
        tenant_id=current_user.tenant_id,
        stage=stage,
        assigned_to=user_filter,
        client_id=client_id,
        page=page,
        page_size=page_size,
    )

    # Build response items
    items = []
    for opp in opportunities:
        items.append(
            OpportunityResponse(
                id=opp.id,
                tenant_id=opp.tenant_id,
                name=opp.name,
                description=opp.description,
                client_id=opp.client_id,
                client_name=opp.client.name,
                assigned_to=opp.assigned_to,
                sales_rep_name=opp.sales_rep.full_name,
                estimated_value=opp.estimated_value,
                currency=opp.currency,
                probability=opp.probability,
                expected_close_date=opp.expected_close_date,
                actual_close_date=opp.actual_close_date,
                stage=opp.stage,
                loss_reason=opp.loss_reason,
                weighted_value=opp.weighted_value,
                is_closed=opp.is_closed,
                is_won=opp.is_won,
                created_at=opp.created_at,
                updated_at=opp.updated_at,
            )
        )

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return OpportunityListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opportunity_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get opportunity by ID

    Returns detailed opportunity information.

    **Access Control:**
    - Sales reps can only view their own opportunities
    - Supervisors and admins can view all opportunities in tenant

    **Response includes:**
    - Full opportunity details
    - Client information
    - Sales rep information
    - Calculated metrics (weighted value, status flags)
    """
    repo = OpportunityRepository(db)

    opportunity = await repo.get_opportunity_by_id(
        opportunity_id=opportunity_id,
        tenant_id=current_user.tenant_id,
    )

    # Apply RBAC
    if current_user.role == UserRole.SALES_REP:
        if opportunity.assigned_to != current_user.id:
            raise ForbiddenError("You don't have access to this opportunity")

    return OpportunityResponse(
        id=opportunity.id,
        tenant_id=opportunity.tenant_id,
        name=opportunity.name,
        description=opportunity.description,
        client_id=opportunity.client_id,
        client_name=opportunity.client.name,
        assigned_to=opportunity.assigned_to,
        sales_rep_name=opportunity.sales_rep.full_name,
        estimated_value=opportunity.estimated_value,
        currency=opportunity.currency,
        probability=opportunity.probability,
        expected_close_date=opportunity.expected_close_date,
        actual_close_date=opportunity.actual_close_date,
        stage=opportunity.stage,
        loss_reason=opportunity.loss_reason,
        weighted_value=opportunity.weighted_value,
        is_closed=opportunity.is_closed,
        is_won=opportunity.is_won,
        created_at=opportunity.created_at,
        updated_at=opportunity.updated_at,
    )


@router.put("/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: UUID,
    data: OpportunityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update opportunity

    Updates an existing opportunity.

    **Business Rules:**
    - Cannot update closed opportunities (use stage endpoint instead)
    - Weighted value recalculated automatically
    - Closing opportunity updates probability and close date

    **Access Control:**
    - Sales reps can only update their own opportunities
    - Supervisors and admins can update any opportunity

    **Updatable fields:**
    - name, description
    - estimated_value, currency, probability
    - expected_close_date
    - stage (also use PATCH /stage endpoint)
    - loss_reason (when closing as lost)
    """
    repo = OpportunityRepository(db)

    # Get opportunity first to check access
    opportunity = await repo.get_opportunity_by_id(
        opportunity_id=opportunity_id,
        tenant_id=current_user.tenant_id,
    )

    # Apply RBAC
    if current_user.role == UserRole.SALES_REP:
        if opportunity.assigned_to != current_user.id:
            raise ForbiddenError("You don't have access to this opportunity")

    # Update opportunity
    updated_opportunity = await repo.update_opportunity(
        opportunity_id=opportunity_id,
        tenant_id=current_user.tenant_id,
        data=data,
    )

    return OpportunityResponse(
        id=updated_opportunity.id,
        tenant_id=updated_opportunity.tenant_id,
        name=updated_opportunity.name,
        description=updated_opportunity.description,
        client_id=updated_opportunity.client_id,
        client_name=updated_opportunity.client.name,
        assigned_to=updated_opportunity.assigned_to,
        sales_rep_name=updated_opportunity.sales_rep.full_name,
        estimated_value=updated_opportunity.estimated_value,
        currency=updated_opportunity.currency,
        probability=updated_opportunity.probability,
        expected_close_date=updated_opportunity.expected_close_date,
        actual_close_date=updated_opportunity.actual_close_date,
        stage=updated_opportunity.stage,
        loss_reason=updated_opportunity.loss_reason,
        weighted_value=updated_opportunity.weighted_value,
        is_closed=updated_opportunity.is_closed,
        is_won=updated_opportunity.is_won,
        created_at=updated_opportunity.created_at,
        updated_at=updated_opportunity.updated_at,
    )


@router.patch("/{opportunity_id}/stage", response_model=OpportunityResponse)
async def update_opportunity_stage(
    opportunity_id: UUID,
    data: OpportunityStageUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update opportunity stage

    Changes the pipeline stage of an opportunity.

    **Valid Stage Progression:**
    - LEAD → QUALIFIED → PROPOSAL → NEGOTIATION → CLOSED_WON/CLOSED_LOST

    **Business Rules:**
    - Cannot change stage of already closed opportunities
    - CLOSED_LOST requires loss_reason
    - CLOSED_WON/CLOSED_LOST sets actual_close_date to today
    - CLOSED_WON sets probability to 100%
    - CLOSED_LOST sets probability to 0%

    **Access Control:**
    - Sales reps can change stage of their own opportunities
    - Supervisors and admins can change any opportunity stage
    """
    repo = OpportunityRepository(db)

    # Get opportunity first to check access
    opportunity = await repo.get_opportunity_by_id(
        opportunity_id=opportunity_id,
        tenant_id=current_user.tenant_id,
    )

    # Apply RBAC
    if current_user.role == UserRole.SALES_REP:
        if opportunity.assigned_to != current_user.id:
            raise ForbiddenError("You don't have access to this opportunity")

    # Update stage
    updated_opportunity = await repo.update_stage(
        opportunity_id=opportunity_id,
        tenant_id=current_user.tenant_id,
        new_stage=data.stage,
        loss_reason=data.loss_reason,
    )

    return OpportunityResponse(
        id=updated_opportunity.id,
        tenant_id=updated_opportunity.tenant_id,
        name=updated_opportunity.name,
        description=updated_opportunity.description,
        client_id=updated_opportunity.client_id,
        client_name=updated_opportunity.client.name,
        assigned_to=updated_opportunity.assigned_to,
        sales_rep_name=updated_opportunity.sales_rep.full_name,
        estimated_value=updated_opportunity.estimated_value,
        currency=updated_opportunity.currency,
        probability=updated_opportunity.probability,
        expected_close_date=updated_opportunity.expected_close_date,
        actual_close_date=updated_opportunity.actual_close_date,
        stage=updated_opportunity.stage,
        loss_reason=updated_opportunity.loss_reason,
        weighted_value=updated_opportunity.weighted_value,
        is_closed=updated_opportunity.is_closed,
        is_won=updated_opportunity.is_won,
        created_at=updated_opportunity.created_at,
        updated_at=updated_opportunity.updated_at,
    )


@router.delete("/{opportunity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_opportunity(
    opportunity_id: UUID,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Delete opportunity (Admin only)

    Soft deletes an opportunity.

    **Access Control:** Admin only

    **Note:** This is a soft delete. The opportunity is marked as deleted
    but remains in the database for audit purposes.
    """
    repo = OpportunityRepository(db)

    await repo.delete_opportunity(
        opportunity_id=opportunity_id,
        tenant_id=current_user.tenant_id,
    )

    return None


# ============================================================================
# Pipeline Analytics Endpoints
# ============================================================================


@router.get("/pipeline/summary", response_model=PipelineSummary)
async def get_pipeline_summary(
    assigned_to: Optional[UUID] = Query(None, description="Filter by assigned user"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get pipeline summary statistics

    Returns comprehensive pipeline analytics including:
    - Total opportunities and values
    - Weighted pipeline value (sum of value * probability)
    - Statistics by stage (count, total value, weighted value, avg probability)
    - Win rate (% of closed won vs total closed)
    - Average deal size
    - Count of won/lost/active opportunities

    **Access Control:**
    - Sales reps see only their own pipeline statistics
    - Supervisors and admins see tenant-wide or filtered statistics

    **Use Cases:**
    - Dashboard KPIs
    - Sales forecasting
    - Performance tracking
    - Pipeline health monitoring
    """
    repo = OpportunityRepository(db)

    # Apply RBAC
    user_filter = None
    if current_user.role == UserRole.SALES_REP:
        user_filter = current_user.id
    elif assigned_to:
        user_filter = assigned_to

    summary = await repo.get_pipeline_summary(
        tenant_id=current_user.tenant_id,
        assigned_to=user_filter,
    )

    return summary


@router.get("/pipeline/board", response_model=PipelineBoardResponse)
async def get_pipeline_board(
    assigned_to: Optional[UUID] = Query(None, description="Filter by assigned user"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get pipeline board data for Kanban view

    Returns structured data for rendering a Kanban board with opportunities
    organized by stage.

    **Features:**
    - Opportunities grouped by stage
    - Stage-level statistics (count, total value, weighted value)
    - Simplified card data for each opportunity
    - Overall pipeline summary

    **Access Control:**
    - Sales reps see only their own opportunities
    - Supervisors and admins see all opportunities or filtered by user

    **Response Structure:**
    - columns: Array of stage columns with opportunities
    - summary: Overall pipeline statistics

    **Use Cases:**
    - Kanban board UI
    - Drag-and-drop pipeline management
    - Visual pipeline overview
    """
    repo = OpportunityRepository(db)

    # Apply RBAC
    user_filter = None
    if current_user.role == UserRole.SALES_REP:
        user_filter = current_user.id
    elif assigned_to:
        user_filter = assigned_to

    # Get summary first
    summary = await repo.get_pipeline_summary(
        tenant_id=current_user.tenant_id,
        assigned_to=user_filter,
    )

    # Build columns for each stage
    columns = []
    for stage in OpportunityStage:
        # Skip closed stages for the board (optional)
        # if stage in [OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST]:
        #     continue

        opportunities = await repo.get_opportunities_by_stage(
            tenant_id=current_user.tenant_id,
            stage=stage,
            assigned_to=user_filter,
        )

        # Build simplified cards
        cards = []
        for opp in opportunities:
            cards.append(
                PipelineBoardCard(
                    id=opp.id,
                    name=opp.name,
                    client_name=opp.client.name,
                    estimated_value=opp.estimated_value,
                    currency=opp.currency,
                    probability=opp.probability,
                    weighted_value=opp.weighted_value,
                    expected_close_date=opp.expected_close_date,
                    sales_rep_name=opp.sales_rep.full_name,
                    stage=opp.stage,
                )
            )

        # Calculate column statistics
        column_value = sum(float(opp.estimated_value) for opp in opportunities)
        column_weighted = sum(opp.weighted_value for opp in opportunities)

        columns.append(
            PipelineBoardColumn(
                stage=stage,
                count=len(opportunities),
                total_value=column_value,
                weighted_value=column_weighted,
                opportunities=cards,
            )
        )

    return PipelineBoardResponse(
        columns=columns,
        summary=summary,
    )

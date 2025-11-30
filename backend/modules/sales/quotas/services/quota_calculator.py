"""
Quota Calculator Service
Updates quota achievements when sales controls are marked as paid
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import Optional

from models.sales_control import SalesControl, SalesControlLine
from models.quota import Quota, QuotaLine


async def update_quota_achievements(
    sales_control_id: UUID,
    tenant_id: UUID,
    db: AsyncSession
) -> None:
    """
    Update quota achievements when a sales_control is marked as PAID

    This function is called after a sales control (purchase order) is marked as paid.
    It updates the quota achievements for the sales representative assigned to the order.

    Algorithm:
    1. Get sales_control with lines (selectinload for efficiency)
    2. Extract: user_id (assigned_to), year, month from payment_date
    3. Find quota: WHERE user_id=X AND year=Y AND month=M AND tenant_id=T
    4. If quota not found: return (do nothing - quota may not exist for that period)
    5. For each sales_control_line:
       - Find quota_line with same product_line_id
       - If found: quota_line.add_achievement(line_amount)
    6. quota.recalculate_totals()
    7. Flush (commit happens in router)

    Args:
        sales_control_id: ID of the sales control that was marked as paid
        tenant_id: Tenant ID for multi-tenancy isolation
        db: AsyncSession for database operations

    Returns:
        None

    Note:
        This function does NOT commit the transaction. The caller must commit.
        This allows the function to be part of a larger transaction.
    """
    # Step 1: Get sales_control with lines
    stmt = select(SalesControl).where(
        SalesControl.id == sales_control_id,
        SalesControl.tenant_id == tenant_id,
        SalesControl.is_deleted == False,
    ).options(selectinload(SalesControl.lines))

    result = await db.execute(stmt)
    sales_control: Optional[SalesControl] = result.scalar_one_or_none()

    if not sales_control:
        # Sales control not found, nothing to do
        return

    if not sales_control.payment_date:
        # No payment date set, cannot determine quota period
        return

    # Step 2: Extract user_id, year, month from payment_date
    user_id = sales_control.assigned_to
    payment_date = sales_control.payment_date
    year = payment_date.year
    month = payment_date.month

    # Step 3: Find quota for this user and period
    quota_stmt = select(Quota).where(
        Quota.tenant_id == tenant_id,
        Quota.user_id == user_id,
        Quota.year == year,
        Quota.month == month,
        Quota.is_deleted == False,
    ).options(selectinload(Quota.lines))

    quota_result = await db.execute(quota_stmt)
    quota: Optional[Quota] = quota_result.scalar_one_or_none()

    # Step 4: If quota not found, return (do nothing)
    if not quota:
        # No quota defined for this period, nothing to update
        return

    # Step 5: For each sales_control_line, update corresponding quota_line
    for sc_line in sales_control.lines:
        # Find quota_line with same product_line_id
        quota_line = quota.get_line_by_product_line_id(sc_line.product_line_id)

        if quota_line:
            # Update achievement
            quota_line.add_achievement(sc_line.line_amount)

    # Step 6: Recalculate quota totals
    quota.recalculate_totals()

    # Step 7: Flush changes (commit happens in caller)
    await db.flush()

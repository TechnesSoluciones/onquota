"""
Commitment Repository
Database operations for commitments and follow-ups
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime
import uuid

from models.visit import Commitment, CommitmentStatus
from modules.visits.schemas_enhanced import CommitmentCreate, CommitmentUpdate


class CommitmentRepository:
    """Repository for Commitment CRUD operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_commitment(
        self,
        data: CommitmentCreate,
        tenant_id: UUID,
        created_by_user_id: UUID,
    ) -> Commitment:
        """Create a new commitment"""
        commitment = Commitment(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            visit_id=data.visit_id,
            client_id=data.client_id,
            assigned_to_user_id=data.assigned_to_user_id,
            created_by_user_id=created_by_user_id,
            type=data.type,
            title=data.title,
            description=data.description,
            due_date=data.due_date,
            priority=data.priority,
            status=CommitmentStatus.PENDING,
            reminder_date=data.reminder_date,
            reminder_sent=False,
        )

        self.db.add(commitment)
        await self.db.flush()
        await self.db.refresh(commitment)
        return commitment

    async def get_commitment(
        self,
        commitment_id: UUID,
        tenant_id: UUID,
    ) -> Optional[Commitment]:
        """Get a commitment by ID"""
        query = select(Commitment).where(
            and_(
                Commitment.id == commitment_id,
                Commitment.tenant_id == tenant_id,
                Commitment.is_deleted == False,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_commitments(
        self,
        tenant_id: UUID,
        client_id: Optional[UUID] = None,
        visit_id: Optional[UUID] = None,
        assigned_to_user_id: Optional[UUID] = None,
        status: Optional[CommitmentStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Commitment], int]:
        """
        Get paginated list of commitments with filters

        Args:
            tenant_id: Tenant UUID
            client_id: Filter by client
            visit_id: Filter by visit
            assigned_to_user_id: Filter by assigned user
            status: Filter by status
            start_date: Filter by due date >= start_date
            end_date: Filter by due date <= end_date
            page: Page number
            page_size: Items per page

        Returns:
            Tuple of (commitments list, total count)
        """
        # Build conditions
        conditions = [
            Commitment.tenant_id == tenant_id,
            Commitment.is_deleted == False,
        ]

        if client_id:
            conditions.append(Commitment.client_id == client_id)

        if visit_id:
            conditions.append(Commitment.visit_id == visit_id)

        if assigned_to_user_id:
            conditions.append(Commitment.assigned_to_user_id == assigned_to_user_id)

        if status:
            conditions.append(Commitment.status == status)

        if start_date:
            conditions.append(Commitment.due_date >= start_date)

        if end_date:
            conditions.append(Commitment.due_date <= end_date)

        # Count query
        count_query = select(func.count(Commitment.id)).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Data query
        query = (
            select(Commitment)
            .where(and_(*conditions))
            .order_by(Commitment.due_date.asc(), Commitment.priority.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await self.db.execute(query)
        commitments = result.scalars().all()

        return commitments, total

    async def get_pending_commitments(
        self,
        tenant_id: UUID,
        assigned_to_user_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Commitment], int]:
        """Get all pending commitments"""
        return await self.get_commitments(
            tenant_id=tenant_id,
            assigned_to_user_id=assigned_to_user_id,
            status=CommitmentStatus.PENDING,
            page=page,
            page_size=page_size,
        )

    async def get_overdue_commitments(
        self,
        tenant_id: UUID,
        assigned_to_user_id: Optional[UUID] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Commitment], int]:
        """Get overdue commitments (past due date and not completed)"""
        conditions = [
            Commitment.tenant_id == tenant_id,
            Commitment.is_deleted == False,
            Commitment.due_date < datetime.utcnow(),
            Commitment.status.in_([CommitmentStatus.PENDING, CommitmentStatus.IN_PROGRESS]),
        ]

        if assigned_to_user_id:
            conditions.append(Commitment.assigned_to_user_id == assigned_to_user_id)

        # Count query
        count_query = select(func.count(Commitment.id)).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = count_result.scalar() or 0

        # Data query
        query = (
            select(Commitment)
            .where(and_(*conditions))
            .order_by(Commitment.due_date.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await self.db.execute(query)
        commitments = result.scalars().all()

        return commitments, total

    async def update_commitment(
        self,
        commitment_id: UUID,
        tenant_id: UUID,
        data: CommitmentUpdate,
    ) -> Optional[Commitment]:
        """Update a commitment"""
        commitment = await self.get_commitment(commitment_id, tenant_id)

        if not commitment:
            return None

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(commitment, field, value)

        await self.db.flush()
        await self.db.refresh(commitment)
        return commitment

    async def complete_commitment(
        self,
        commitment_id: UUID,
        tenant_id: UUID,
        completion_notes: Optional[str] = None,
    ) -> Optional[Commitment]:
        """Mark a commitment as completed"""
        commitment = await self.get_commitment(commitment_id, tenant_id)

        if not commitment:
            return None

        commitment.status = CommitmentStatus.COMPLETED
        commitment.completed_at = datetime.utcnow()
        commitment.completion_notes = completion_notes

        await self.db.flush()
        await self.db.refresh(commitment)
        return commitment

    async def delete_commitment(
        self,
        commitment_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Soft delete a commitment"""
        commitment = await self.get_commitment(commitment_id, tenant_id)

        if not commitment:
            return False

        commitment.is_deleted = True
        await self.db.flush()
        return True

    async def mark_overdue_commitments(
        self,
        tenant_id: UUID,
    ) -> int:
        """
        Mark commitments as overdue if past due date
        Returns number of commitments updated
        """
        query = select(Commitment).where(
            and_(
                Commitment.tenant_id == tenant_id,
                Commitment.is_deleted == False,
                Commitment.due_date < datetime.utcnow(),
                Commitment.status.in_([CommitmentStatus.PENDING, CommitmentStatus.IN_PROGRESS]),
            )
        )

        result = await self.db.execute(query)
        commitments = result.scalars().all()

        count = 0
        for commitment in commitments:
            commitment.status = CommitmentStatus.OVERDUE
            count += 1

        if count > 0:
            await self.db.flush()

        return count

    async def get_commitments_by_visit(
        self,
        visit_id: UUID,
        tenant_id: UUID,
    ) -> List[Commitment]:
        """Get all commitments for a specific visit"""
        query = (
            select(Commitment)
            .where(
                and_(
                    Commitment.visit_id == visit_id,
                    Commitment.tenant_id == tenant_id,
                    Commitment.is_deleted == False,
                )
            )
            .order_by(Commitment.due_date.asc())
        )

        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_commitment_stats(
        self,
        tenant_id: UUID,
        assigned_to_user_id: Optional[UUID] = None,
    ) -> dict:
        """Get commitment statistics"""
        conditions = [
            Commitment.tenant_id == tenant_id,
            Commitment.is_deleted == False,
        ]

        if assigned_to_user_id:
            conditions.append(Commitment.assigned_to_user_id == assigned_to_user_id)

        # Total commitments
        total_query = select(func.count(Commitment.id)).where(and_(*conditions))
        total_result = await self.db.execute(total_query)
        total = total_result.scalar() or 0

        # By status
        pending_query = select(func.count(Commitment.id)).where(
            and_(*conditions, Commitment.status == CommitmentStatus.PENDING)
        )
        pending_result = await self.db.execute(pending_query)
        pending = pending_result.scalar() or 0

        in_progress_query = select(func.count(Commitment.id)).where(
            and_(*conditions, Commitment.status == CommitmentStatus.IN_PROGRESS)
        )
        in_progress_result = await self.db.execute(in_progress_query)
        in_progress = in_progress_result.scalar() or 0

        completed_query = select(func.count(Commitment.id)).where(
            and_(*conditions, Commitment.status == CommitmentStatus.COMPLETED)
        )
        completed_result = await self.db.execute(completed_query)
        completed = completed_result.scalar() or 0

        overdue_query = select(func.count(Commitment.id)).where(
            and_(*conditions, Commitment.status == CommitmentStatus.OVERDUE)
        )
        overdue_result = await self.db.execute(overdue_query)
        overdue = overdue_result.scalar() or 0

        # Completion rate
        completion_rate = (completed / total * 100) if total > 0 else 0

        return {
            "total_commitments": total,
            "pending": pending,
            "in_progress": in_progress,
            "completed": completed,
            "overdue": overdue,
            "completion_rate": round(completion_rate, 2),
        }

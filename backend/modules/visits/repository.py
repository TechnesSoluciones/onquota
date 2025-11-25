"""
Visit and Call Repository
Database operations for visits and calls
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, extract
from sqlalchemy.orm import selectinload
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal

from modules.visits.models import Visit, Call, VisitStatus, CallType, CallStatus
from modules.visits.schemas import (
    VisitCreate,
    VisitUpdate,
    VisitCheckIn,
    VisitCheckOut,
    CallCreate,
    CallUpdate,
    CallStart,
    CallEnd,
)


class VisitRepository:
    """Repository for Visit operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_visit(
        self,
        data: VisitCreate,
        user_id: UUID,
        tenant_id: UUID,
        user_name: Optional[str] = None,
        client_name: Optional[str] = None,
    ) -> Visit:
        """Create a new visit"""
        visit = Visit(
            tenant_id=tenant_id,
            user_id=user_id,
            user_name=user_name,
            client_id=data.client_id,
            client_name=client_name,
            title=data.title,
            description=data.description,
            scheduled_date=data.scheduled_date,
            duration_minutes=data.duration_minutes,
            notes=data.notes,
            outcome=data.outcome,
            follow_up_required=data.follow_up_required,
            follow_up_date=data.follow_up_date,
            status=VisitStatus.SCHEDULED,
        )
        self.db.add(visit)
        await self.db.flush()
        await self.db.refresh(visit)
        return visit

    async def get_visit(self, visit_id: UUID, tenant_id: UUID) -> Optional[Visit]:
        """Get a visit by ID"""
        stmt = select(Visit).where(
            and_(
                Visit.id == visit_id,
                Visit.tenant_id == tenant_id,
                Visit.is_deleted == False
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_visits(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        client_id: Optional[UUID] = None,
        status: Optional[VisitStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Visit], int]:
        """Get paginated visits with filters"""
        conditions = [
            Visit.tenant_id == tenant_id,
            Visit.is_deleted == False
        ]

        if user_id:
            conditions.append(Visit.user_id == user_id)
        if client_id:
            conditions.append(Visit.client_id == client_id)
        if status:
            conditions.append(Visit.status == status)
        if start_date:
            conditions.append(Visit.scheduled_date >= start_date)
        if end_date:
            conditions.append(Visit.scheduled_date <= end_date)

        # Count total
        count_stmt = select(func.count(Visit.id)).where(and_(*conditions))
        total = await self.db.scalar(count_stmt)

        # Get paginated results
        offset = (page - 1) * page_size
        stmt = (
            select(Visit)
            .where(and_(*conditions))
            .order_by(Visit.scheduled_date.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        visits = result.scalars().all()

        return visits, total

    async def update_visit(
        self,
        visit_id: UUID,
        tenant_id: UUID,
        data: VisitUpdate
    ) -> Optional[Visit]:
        """Update a visit"""
        visit = await self.get_visit(visit_id, tenant_id)
        if not visit:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(visit, field, value)

        visit.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(visit)
        return visit

    async def check_in(
        self,
        visit_id: UUID,
        tenant_id: UUID,
        data: VisitCheckIn
    ) -> Optional[Visit]:
        """Check in to a visit (GPS)"""
        visit = await self.get_visit(visit_id, tenant_id)
        if not visit:
            return None

        visit.check_in_time = datetime.utcnow()
        visit.check_in_latitude = data.latitude
        visit.check_in_longitude = data.longitude
        visit.check_in_address = data.address
        visit.status = VisitStatus.IN_PROGRESS
        visit.updated_at = datetime.utcnow()

        await self.db.flush()
        await self.db.refresh(visit)
        return visit

    async def check_out(
        self,
        visit_id: UUID,
        tenant_id: UUID,
        data: VisitCheckOut
    ) -> Optional[Visit]:
        """Check out from a visit (GPS)"""
        visit = await self.get_visit(visit_id, tenant_id)
        if not visit:
            return None

        visit.check_out_time = datetime.utcnow()
        visit.check_out_latitude = data.latitude
        visit.check_out_longitude = data.longitude
        visit.check_out_address = data.address
        visit.notes = data.notes
        visit.outcome = data.outcome
        visit.status = VisitStatus.COMPLETED
        visit.updated_at = datetime.utcnow()

        # Calculate actual duration
        if visit.check_in_time and visit.check_out_time:
            duration = visit.check_out_time - visit.check_in_time
            visit.duration_minutes = Decimal(duration.total_seconds() / 60)

        await self.db.flush()
        await self.db.refresh(visit)
        return visit

    async def delete_visit(self, visit_id: UUID, tenant_id: UUID) -> bool:
        """Soft delete a visit"""
        visit = await self.get_visit(visit_id, tenant_id)
        if not visit:
            return False

        visit.is_deleted = True
        visit.updated_at = datetime.utcnow()
        await self.db.flush()
        return True


class CallRepository:
    """Repository for Call operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_call(
        self,
        data: CallCreate,
        user_id: UUID,
        tenant_id: UUID,
        user_name: Optional[str] = None,
        client_name: Optional[str] = None,
    ) -> Call:
        """Create a new call"""
        call = Call(
            tenant_id=tenant_id,
            user_id=user_id,
            user_name=user_name,
            client_id=data.client_id,
            client_name=client_name,
            phone_number=data.phone_number,
            title=data.title,
            description=data.description,
            call_type=data.call_type,
            scheduled_date=data.scheduled_date,
            notes=data.notes,
            outcome=data.outcome,
            follow_up_required=data.follow_up_required,
            follow_up_date=data.follow_up_date,
            status=CallStatus.SCHEDULED if data.scheduled_date else CallStatus.COMPLETED,
        )
        self.db.add(call)
        await self.db.flush()
        await self.db.refresh(call)
        return call

    async def get_call(self, call_id: UUID, tenant_id: UUID) -> Optional[Call]:
        """Get a call by ID"""
        stmt = select(Call).where(
            and_(
                Call.id == call_id,
                Call.tenant_id == tenant_id,
                Call.is_deleted == False
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_calls(
        self,
        tenant_id: UUID,
        user_id: Optional[UUID] = None,
        client_id: Optional[UUID] = None,
        call_type: Optional[CallType] = None,
        status: Optional[CallStatus] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[Call], int]:
        """Get paginated calls with filters"""
        conditions = [
            Call.tenant_id == tenant_id,
            Call.is_deleted == False
        ]

        if user_id:
            conditions.append(Call.user_id == user_id)
        if client_id:
            conditions.append(Call.client_id == client_id)
        if call_type:
            conditions.append(Call.call_type == call_type)
        if status:
            conditions.append(Call.status == status)
        if start_date:
            conditions.append(Call.created_at >= start_date)
        if end_date:
            conditions.append(Call.created_at <= end_date)

        # Count total
        count_stmt = select(func.count(Call.id)).where(and_(*conditions))
        total = await self.db.scalar(count_stmt)

        # Get paginated results
        offset = (page - 1) * page_size
        stmt = (
            select(Call)
            .where(and_(*conditions))
            .order_by(Call.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        result = await self.db.execute(stmt)
        calls = result.scalars().all()

        return calls, total

    async def update_call(
        self,
        call_id: UUID,
        tenant_id: UUID,
        data: CallUpdate
    ) -> Optional[Call]:
        """Update a call"""
        call = await self.get_call(call_id, tenant_id)
        if not call:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(call, field, value)

        call.updated_at = datetime.utcnow()
        await self.db.flush()
        await self.db.refresh(call)
        return call

    async def start_call(
        self,
        call_id: UUID,
        tenant_id: UUID,
        data: CallStart
    ) -> Optional[Call]:
        """Start a call"""
        call = await self.get_call(call_id, tenant_id)
        if not call:
            return None

        call.start_time = datetime.utcnow()
        if data.phone_number:
            call.phone_number = data.phone_number
        call.updated_at = datetime.utcnow()

        await self.db.flush()
        await self.db.refresh(call)
        return call

    async def end_call(
        self,
        call_id: UUID,
        tenant_id: UUID,
        data: CallEnd
    ) -> Optional[Call]:
        """End a call"""
        call = await self.get_call(call_id, tenant_id)
        if not call:
            return None

        call.end_time = datetime.utcnow()
        call.notes = data.notes
        call.outcome = data.outcome
        call.status = data.status
        call.updated_at = datetime.utcnow()

        # Calculate duration
        if call.start_time and call.end_time:
            duration = call.end_time - call.start_time
            call.duration_seconds = Decimal(duration.total_seconds())

        await self.db.flush()
        await self.db.refresh(call)
        return call

    async def delete_call(self, call_id: UUID, tenant_id: UUID) -> bool:
        """Soft delete a call"""
        call = await self.get_call(call_id, tenant_id)
        if not call:
            return False

        call.is_deleted = True
        call.updated_at = datetime.utcnow()
        await self.db.flush()
        return True

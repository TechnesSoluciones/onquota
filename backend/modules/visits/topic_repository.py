"""
Visit Topic Repository
Database operations for visit topic catalog
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Optional, List, Tuple
from uuid import UUID
import uuid

from models.visit import VisitTopic
from modules.visits.schemas_enhanced import VisitTopicCreate, VisitTopicUpdate


class VisitTopicRepository:
    """Repository for VisitTopic CRUD operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_topic(
        self,
        data: VisitTopicCreate,
        tenant_id: UUID,
    ) -> VisitTopic:
        """Create a new visit topic"""
        topic = VisitTopic(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            name=data.name,
            description=data.description,
            icon=data.icon,
            color=data.color,
            is_active=True,
        )

        self.db.add(topic)
        await self.db.flush()
        await self.db.refresh(topic)
        return topic

    async def get_topic(
        self,
        topic_id: UUID,
        tenant_id: UUID,
    ) -> Optional[VisitTopic]:
        """Get a visit topic by ID"""
        query = select(VisitTopic).where(
            and_(
                VisitTopic.id == topic_id,
                VisitTopic.tenant_id == tenant_id,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_topics(
        self,
        tenant_id: UUID,
        is_active: Optional[bool] = None,
        page: int = 1,
        page_size: int = 100,
    ) -> Tuple[List[VisitTopic], int]:
        """
        Get paginated list of visit topics

        Args:
            tenant_id: Tenant UUID
            is_active: Filter by active status (None = all)
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Tuple of (topics list, total count)
        """
        # Build base query
        conditions = [VisitTopic.tenant_id == tenant_id]

        if is_active is not None:
            conditions.append(VisitTopic.is_active == is_active)

        # Count query
        count_query = select(VisitTopic).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = len(count_result.scalars().all())

        # Data query with pagination
        query = (
            select(VisitTopic)
            .where(and_(*conditions))
            .order_by(VisitTopic.name)
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        result = await self.db.execute(query)
        topics = result.scalars().all()

        return topics, total

    async def get_all_active(
        self,
        tenant_id: UUID,
    ) -> List[VisitTopic]:
        """Get all active topics (no pagination) for dropdowns"""
        query = (
            select(VisitTopic)
            .where(
                and_(
                    VisitTopic.tenant_id == tenant_id,
                    VisitTopic.is_active == True,
                )
            )
            .order_by(VisitTopic.name)
        )

        result = await self.db.execute(query)
        return result.scalars().all()

    async def update_topic(
        self,
        topic_id: UUID,
        tenant_id: UUID,
        data: VisitTopicUpdate,
    ) -> Optional[VisitTopic]:
        """Update a visit topic"""
        topic = await self.get_topic(topic_id, tenant_id)

        if not topic:
            return None

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(topic, field, value)

        await self.db.flush()
        await self.db.refresh(topic)
        return topic

    async def deactivate_topic(
        self,
        topic_id: UUID,
        tenant_id: UUID,
    ) -> bool:
        """Deactivate a topic (soft delete)"""
        topic = await self.get_topic(topic_id, tenant_id)

        if not topic:
            return False

        topic.is_active = False
        await self.db.flush()
        return True

    async def seed_default_topics(
        self,
        tenant_id: UUID,
    ) -> List[VisitTopic]:
        """
        Seed default topics for a new tenant

        Returns:
            List of created topics
        """
        default_topics = [
            {"name": "Proyecto Nuevo", "icon": "🏗️", "color": "#3b82f6", "description": "Discusión sobre nuevos proyectos"},
            {"name": "Soporte Técnico", "icon": "🔧", "color": "#ef4444", "description": "Soporte técnico y resolución de problemas"},
            {"name": "Presentación de Producto", "icon": "📊", "color": "#10b981", "description": "Presentación de productos o servicios"},
            {"name": "Seguimiento Cotización", "icon": "💰", "color": "#f59e0b", "description": "Seguimiento de cotizaciones enviadas"},
            {"name": "Negociación Comercial", "icon": "🤝", "color": "#8b5cf6", "description": "Negociación de términos comerciales"},
            {"name": "Capacitación", "icon": "🎓", "color": "#06b6d4", "description": "Capacitación de usuarios o clientes"},
            {"name": "Instalación/Entrega", "icon": "📦", "color": "#14b8a6", "description": "Instalación o entrega de productos"},
            {"name": "Reclamo/Queja", "icon": "⚠️", "color": "#dc2626", "description": "Atención de reclamos o quejas"},
            {"name": "Mantenimiento", "icon": "🛠️", "color": "#6366f1", "description": "Mantenimiento preventivo o correctivo"},
            {"name": "Otro", "icon": "📝", "color": "#6b7280", "description": "Otros temas no categorizados"},
        ]

        created_topics = []

        for topic_data in default_topics:
            topic = VisitTopic(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                name=topic_data["name"],
                description=topic_data["description"],
                icon=topic_data["icon"],
                color=topic_data["color"],
                is_active=True,
            )
            self.db.add(topic)
            created_topics.append(topic)

        await self.db.flush()

        # Refresh all
        for topic in created_topics:
            await self.db.refresh(topic)

        return created_topics

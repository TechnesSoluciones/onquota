"""
Audit Log model para rastrear acciones administrativas
"""
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from models.base import BaseModel


class AuditLog(BaseModel):
    """
    Registro de auditoría para acciones administrativas

    Attributes:
        action: Tipo de acción realizada (user.created, user.updated, etc.)
        resource_type: Tipo de recurso afectado (user, tenant, etc.)
        resource_id: ID del recurso afectado
        description: Descripción legible de la acción
        changes: Diccionario con los cambios realizados
        user_id: Usuario que realizó la acción
        ip_address: Dirección IP del usuario
        user_agent: User agent del navegador
    """

    __tablename__ = "audit_logs"

    # Campos principales
    action = Column(String(100), nullable=False, index=True)
    resource_type = Column(String(100), nullable=False, index=True)
    resource_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    description = Column(Text, nullable=True)
    changes = Column(JSONB, default={}, nullable=False)

    # Usuario que realizó la acción
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Metadata de la request
    ip_address = Column(String(50), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], lazy="joined")

"""
Celery Tasks para módulo SPA
Tareas asíncronas y programadas.
"""
from celery import shared_task
from datetime import date, timedelta
from uuid import UUID
import logging

from sqlalchemy import select, update, and_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from modules.spa.models import SPAAgreement, SPAUploadLog
from modules.clients.models import Client
from core.config import settings

logger = logging.getLogger(__name__)

# Engine para tareas Celery (sync/async según configuración)
engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@shared_task(name="spa.update_active_status")
def update_spa_active_status():
    """
    Actualiza el campo is_active de todos los SPAs según fechas.

    Ejecutar diariamente a medianoche.

    Lógica:
    - is_active = True si today está entre start_date y end_date
    - is_active = False en caso contrario

    Configurar en Celery Beat:
    ```python
    CELERY_BEAT_SCHEDULE = {
        'update-spa-active-status': {
            'task': 'spa.update_active_status',
            'schedule': crontab(hour=0, minute=0),  # Diario a medianoche
        },
    }
    ```
    """
    import asyncio

    async def _update():
        async with async_session_maker() as session:
            try:
                today = date.today()

                # Activar SPAs que ahora están vigentes
                activate_stmt = (
                    update(SPAAgreement)
                    .where(
                        and_(
                            SPAAgreement.start_date <= today,
                            SPAAgreement.end_date >= today,
                            SPAAgreement.is_active == False,
                            SPAAgreement.deleted_at.is_(None)
                        )
                    )
                    .values(is_active=True)
                )

                result_activate = await session.execute(activate_stmt)
                activated_count = result_activate.rowcount

                # Desactivar SPAs que expiraron
                deactivate_stmt = (
                    update(SPAAgreement)
                    .where(
                        and_(
                            or_(
                                SPAAgreement.end_date < today,
                                SPAAgreement.start_date > today
                            ),
                            SPAAgreement.is_active == True,
                            SPAAgreement.deleted_at.is_(None)
                        )
                    )
                    .values(is_active=False)
                )

                result_deactivate = await session.execute(deactivate_stmt)
                deactivated_count = result_deactivate.rowcount

                await session.commit()

                logger.info(
                    f"Updated SPA active status: "
                    f"{activated_count} activated, {deactivated_count} deactivated"
                )

                return {
                    "activated": activated_count,
                    "deactivated": deactivated_count
                }

            except Exception as e:
                logger.error(f"Error updating SPA active status: {str(e)}", exc_info=True)
                await session.rollback()
                raise

    return asyncio.run(_update())


@shared_task(name="spa.notify_expiring_spas")
def notify_expiring_spas(days_before: int = 30):
    """
    Notifica SPAs que expiran en los próximos N días.

    Ejecutar semanalmente.

    Args:
        days_before: Días de anticipación para notificar (default: 30)

    Lógica:
    1. Busca SPAs que expiran entre hoy y hoy + days_before
    2. Agrupa por tenant
    3. Envía notificación (email/webhook) a administradores del tenant

    Configurar en Celery Beat:
    ```python
    CELERY_BEAT_SCHEDULE = {
        'notify-expiring-spas': {
            'task': 'spa.notify_expiring_spas',
            'schedule': crontab(day_of_week=1, hour=9, minute=0),  # Lunes 9am
            'kwargs': {'days_before': 30}
        },
    }
    ```
    """
    import asyncio

    async def _notify():
        async with async_session_maker() as session:
            try:
                today = date.today()
                threshold_date = today + timedelta(days=days_before)

                # Buscar SPAs por expirar
                stmt = (
                    select(SPAAgreement)
                    .join(Client, SPAAgreement.client_id == Client.id)
                    .where(
                        and_(
                            SPAAgreement.end_date >= today,
                            SPAAgreement.end_date <= threshold_date,
                            SPAAgreement.is_active == True,
                            SPAAgreement.deleted_at.is_(None)
                        )
                    )
                    .order_by(SPAAgreement.end_date)
                )

                result = await session.execute(stmt)
                expiring_spas = result.scalars().all()

                if not expiring_spas:
                    logger.info("No expiring SPAs found")
                    return {"count": 0}

                # Agrupar por tenant
                spas_by_tenant = {}
                for spa in expiring_spas:
                    if spa.tenant_id not in spas_by_tenant:
                        spas_by_tenant[spa.tenant_id] = []
                    spas_by_tenant[spa.tenant_id].append(spa)

                # Enviar notificaciones
                notifications_sent = 0
                for tenant_id, tenant_spas in spas_by_tenant.items():
                    try:
                        # TODO: Implementar envío de email/webhook
                        # await send_expiring_notification(tenant_id, tenant_spas)

                        logger.info(
                            f"Would notify tenant {tenant_id} about "
                            f"{len(tenant_spas)} expiring SPAs"
                        )
                        notifications_sent += 1

                    except Exception as e:
                        logger.error(
                            f"Failed to notify tenant {tenant_id}: {str(e)}",
                            exc_info=True
                        )

                logger.info(
                    f"Processed {len(expiring_spas)} expiring SPAs, "
                    f"sent {notifications_sent} notifications"
                )

                return {
                    "count": len(expiring_spas),
                    "notifications_sent": notifications_sent
                }

            except Exception as e:
                logger.error(f"Error notifying expiring SPAs: {str(e)}", exc_info=True)
                raise

    return asyncio.run(_notify())


@shared_task(name="spa.process_large_file")
def process_large_spa_file(
    file_path: str,
    batch_id: str,
    tenant_id: str,
    user_id: str,
    auto_create_clients: bool = False
):
    """
    Procesa archivos SPA grandes en background.

    Útil para archivos con miles de registros que no deberían
    procesarse síncronamente en el request HTTP.

    Args:
        file_path: Path del archivo temporal
        batch_id: UUID del batch
        tenant_id: UUID del tenant
        user_id: UUID del usuario
        auto_create_clients: Si crear clientes automáticamente

    Flujo:
    1. Lee archivo desde file_path
    2. Procesa en chunks
    3. Actualiza progreso en SPAUploadLog
    4. Notifica cuando termine

    Uso desde API:
    ```python
    @router.post("/upload-async")
    async def upload_large_file(...):
        # Guardar archivo temporalmente
        temp_path = await save_temp_file(file)

        # Crear log inicial
        upload_log = SPAUploadLog(batch_id=batch_id, status='processing')
        db.add(upload_log)
        await db.commit()

        # Disparar tarea
        process_large_spa_file.delay(
            file_path=temp_path,
            batch_id=str(batch_id),
            tenant_id=str(tenant_id),
            user_id=str(user_id),
            auto_create_clients=auto_create_clients
        )

        return {"batch_id": batch_id, "status": "processing"}
    ```
    """
    import asyncio
    from pathlib import Path

    async def _process():
        async with async_session_maker() as session:
            try:
                from modules.spa.service import SPAService
                from modules.spa.repository import SPARepository
                from modules.clients.repository import ClientRepository
                from modules.spa.excel_parser import ExcelParserService
                from fastapi import UploadFile
                from datetime import datetime

                # Inicializar servicios
                spa_repo = SPARepository()
                client_repo = ClientRepository()
                spa_service = SPAService(spa_repo, client_repo)
                parser = ExcelParserService()

                # Validar que archivo existe
                file_obj = Path(file_path)
                if not file_obj.exists():
                    raise FileNotFoundError(f"File not found: {file_path}")

                # Crear UploadFile mock
                with open(file_path, 'rb') as f:
                    upload_file = UploadFile(
                        filename=file_obj.name,
                        file=f
                    )

                    # Procesar
                    start_time = datetime.utcnow()

                    result = await spa_service.upload_spa_file(
                        file=upload_file,
                        user_id=UUID(user_id),
                        tenant_id=UUID(tenant_id),
                        auto_create_clients=auto_create_clients,
                        db=session
                    )

                await session.commit()

                # Limpiar archivo temporal
                file_obj.unlink(missing_ok=True)

                logger.info(
                    f"Large file processed: {result.success_count}/{result.total_rows} success"
                )

                # TODO: Notificar usuario
                # await notify_upload_complete(user_id, result)

                return {
                    "batch_id": batch_id,
                    "success_count": result.success_count,
                    "error_count": result.error_count,
                    "total_rows": result.total_rows
                }

            except Exception as e:
                logger.error(
                    f"Error processing large file {file_path}: {str(e)}",
                    exc_info=True
                )
                await session.rollback()

                # Actualizar log con error
                try:
                    stmt = (
                        update(SPAUploadLog)
                        .where(SPAUploadLog.batch_id == UUID(batch_id))
                        .values(error_message=str(e))
                    )
                    await session.execute(stmt)
                    await session.commit()
                except Exception:
                    pass

                raise

    return asyncio.run(_process())


@shared_task(name="spa.cleanup_old_uploads")
def cleanup_old_upload_logs(days_to_keep: int = 90):
    """
    Limpia logs de uploads antiguos.

    Args:
        days_to_keep: Mantener logs de últimos N días (default: 90)

    Ejecutar mensualmente.

    Configurar en Celery Beat:
    ```python
    CELERY_BEAT_SCHEDULE = {
        'cleanup-spa-upload-logs': {
            'task': 'spa.cleanup_old_uploads',
            'schedule': crontab(day_of_month=1, hour=2, minute=0),  # 1er día del mes, 2am
            'kwargs': {'days_to_keep': 90}
        },
    }
    ```
    """
    import asyncio
    from sqlalchemy import delete

    async def _cleanup():
        async with async_session_maker() as session:
            try:
                cutoff_date = date.today() - timedelta(days=days_to_keep)

                stmt = (
                    delete(SPAUploadLog)
                    .where(SPAUploadLog.created_at < cutoff_date)
                )

                result = await session.execute(stmt)
                deleted_count = result.rowcount

                await session.commit()

                logger.info(f"Cleaned up {deleted_count} old upload logs")

                return {"deleted": deleted_count}

            except Exception as e:
                logger.error(f"Error cleaning up upload logs: {str(e)}", exc_info=True)
                await session.rollback()
                raise

    return asyncio.run(_cleanup())


# Helper para importar en Celery app
__all__ = [
    'update_spa_active_status',
    'notify_expiring_spas',
    'process_large_spa_file',
    'cleanup_old_upload_logs'
]

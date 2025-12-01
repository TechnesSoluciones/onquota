"""
API Router para Special Pricing Agreements
"""
from typing import List, Optional
from uuid import UUID
import logging
import io

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Query,
    HTTPException,
    status
)
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from modules.spa.service import SPAService, get_spa_service
from modules.spa.schemas import (
    SPAUploadResult,
    SPAListResponse,
    SPAAgreementResponse,
    SPAAgreementWithClient,
    SPADiscountSearchRequest,
    SPADiscountResponse,
    SPAStatsResponse,
    SPASearchParams,
    SPAUploadLogResponse
)
from modules.spa.exceptions import (
    SPAException,
    SPAFileInvalidException,
    SPAClientNotFoundException
)
from core.database import get_db
from api.dependencies import get_current_user
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/spa", tags=["SPA"])


@router.post("/upload", response_model=SPAUploadResult)
async def upload_spa_file(
    file: UploadFile = File(...),
    auto_create_clients: bool = Query(
        False,
        description="Crear clientes automáticamente si BPID no existe"
    ),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    spa_service: SPAService = Depends(get_spa_service)
):
    """
    Upload archivo SPA (Excel o TSV) con validación y procesamiento.

    El archivo debe contener las siguientes columnas:
    - BPID (Business Partner ID)
    - Ship To Name
    - Article Number
    - Article Description (opcional)
    - List Price
    - App Net Price
    - UOM (opcional, default: 'EA')
    - Start Date
    - End Date

    Proceso:
    1. Valida formato de archivo
    2. Parsea contenido
    3. Valida datos de negocio
    4. Crea/vincula clientes por BPID (si auto_create_clients=True)
    5. Calcula descuentos
    6. Crea registros SPA
    7. Retorna resultado con estadísticas

    Args:
        file: Archivo .xls, .xlsx o .tsv
        auto_create_clients: Si crear clientes automáticamente
        current_user: Usuario autenticado
        db: Sesión de base de datos
        spa_service: Servicio de SPA

    Returns:
        SPAUploadResult con estadísticas y errores
    """
    try:
        logger.info(
            f"Upload SPA file '{file.filename}' by user {current_user.id}, "
            f"tenant {current_user.tenant_id}, auto_create={auto_create_clients}"
        )

        result = await spa_service.upload_spa_file(
            file=file,
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            auto_create_clients=auto_create_clients,
            db=db
        )

        await db.commit()

        logger.info(
            f"Upload complete: {result.success_count}/{result.total_rows} success, "
            f"{result.error_count} errors"
        )

        return result

    except SPAFileInvalidException as e:
        logger.warning(f"Invalid file upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except SPAException as e:
        logger.error(f"SPA error during upload: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error during upload: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process upload"
        )


@router.get("", response_model=SPAListResponse)
async def list_spas(
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(50, ge=1, le=500, description="Tamaño de página"),
    client_id: Optional[UUID] = Query(None, description="Filtrar por cliente"),
    article_number: Optional[str] = Query(None, description="Filtrar por artículo"),
    bpid: Optional[str] = Query(None, description="Filtrar por BPID"),
    active_only: bool = Query(False, description="Solo SPAs activos"),
    search: Optional[str] = Query(None, description="Búsqueda general"),
    sort_by: str = Query("created_at", description="Campo para ordenar"),
    sort_desc: bool = Query(True, description="Orden descendente"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    spa_service: SPAService = Depends(get_spa_service)
):
    """
    Lista SPAs con filtros y paginación.

    Soporta:
    - Filtrado por cliente, artículo, BPID
    - Filtro de solo activos
    - Búsqueda general (nombre cliente, artículo, descripción)
    - Paginación
    - Ordenamiento

    Args:
        page: Número de página (1-indexed)
        page_size: Cantidad de items por página
        client_id: UUID del cliente (opcional)
        article_number: Número de artículo (opcional)
        bpid: BPID del cliente (opcional)
        active_only: Solo SPAs vigentes
        search: Término de búsqueda general
        sort_by: Campo para ordenar
        sort_desc: Orden descendente
        current_user: Usuario autenticado
        db: Sesión de base de datos
        spa_service: Servicio de SPA

    Returns:
        SPAListResponse con items y metadata de paginación
    """
    try:
        params = SPASearchParams(
            page=page,
            page_size=page_size,
            client_id=client_id,
            article_number=article_number,
            bpid=bpid,
            active_only=active_only,
            search=search,
            sort_by=sort_by,
            sort_desc=sort_desc
        )

        result = await spa_service.list_spas(params, current_user.tenant_id, db)
        return result

    except Exception as e:
        logger.error(f"Error listing SPAs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list SPAs"
        )


@router.get("/{spa_id}", response_model=SPAAgreementWithClient)
async def get_spa_detail(
    spa_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    spa_service: SPAService = Depends(get_spa_service)
):
    """
    Obtiene detalle completo de un SPA.

    Incluye:
    - Datos del SPA
    - Información del cliente asociado
    - Estado de vigencia

    Args:
        spa_id: UUID del SPA
        current_user: Usuario autenticado
        db: Sesión de base de datos
        spa_service: Servicio de SPA

    Returns:
        SPAAgreementWithClient con detalle completo

    Raises:
        404: Si el SPA no existe
    """
    try:
        spa = await spa_service.get_spa_detail(spa_id, current_user.tenant_id, db)
        return spa

    except SPAClientNotFoundException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SPA {spa_id} not found"
        )
    except Exception as e:
        logger.error(f"Error getting SPA detail: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get SPA detail"
        )


@router.get("/client/{client_id}", response_model=List[SPAAgreementResponse])
async def get_client_spas(
    client_id: UUID,
    active_only: bool = Query(True, description="Solo SPAs activos"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    spa_service: SPAService = Depends(get_spa_service)
):
    """
    Obtiene todos los SPAs de un cliente específico.

    Útil para:
    - Mostrar descuentos disponibles en vista de cliente
    - Buscar pricing durante cotización
    - Auditoría de acuerdos por cliente

    Args:
        client_id: UUID del cliente
        active_only: Solo SPAs vigentes (default: True)
        tenant_id: ID del tenant
        db: Sesión de base de datos
        spa_service: Servicio de SPA

    Returns:
        Lista de SPAAgreementResponse
    """
    try:
        spas = await spa_service.get_client_spas(
            client_id=client_id,
            tenant_id=current_user.tenant_id,
            active_only=active_only,
            db=db
        )
        return spas

    except Exception as e:
        logger.error(f"Error getting client SPAs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get client SPAs"
        )


@router.post("/search-discount", response_model=SPADiscountResponse)
async def search_discount(
    request: SPADiscountSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    spa_service: SPAService = Depends(get_spa_service)
):
    """
    Busca descuento SPA para combinación cliente/artículo.

    Retorna el SPA activo que coincida con:
    - client_id exacto
    - article_number exacto
    - Fechas vigentes (hoy entre start_date y end_date)

    Caso de uso principal:
    - Durante cotización, vendedor busca precio especial
    - Sistema consulta si existe SPA para ese cliente + producto
    - Retorna descuento aplicable

    Args:
        request: Parámetros de búsqueda (client_id, article_number)
        tenant_id: ID del tenant
        db: Sesión de base de datos
        spa_service: Servicio de SPA

    Returns:
        SPADiscountResponse con resultado de búsqueda
        - found: True si existe descuento
        - discount: Detalle del descuento (si found=True)
    """
    try:
        result = await spa_service.search_discount(request, current_user.tenant_id, db)
        return result

    except Exception as e:
        logger.error(f"Error searching discount: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search discount"
        )


@router.get("/stats", response_model=SPAStatsResponse)
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    spa_service: SPAService = Depends(get_spa_service)
):
    """
    Obtiene estadísticas de SPAs del tenant.

    Métricas incluidas:
    - Total de SPAs
    - SPAs activos
    - SPAs expirados
    - SPAs por expirar (próximos 30 días)
    - Total de clientes con SPAs
    - Promedio de descuento

    Args:
        tenant_id: ID del tenant
        db: Sesión de base de datos
        spa_service: Servicio de SPA

    Returns:
        SPAStatsResponse con métricas
    """
    try:
        stats = await spa_service.get_stats(tenant_id, db)
        return stats

    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get stats"
        )


@router.get("/export")
async def export_spas(
    client_id: Optional[UUID] = Query(None),
    active_only: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    spa_service: SPAService = Depends(get_spa_service)
):
    """
    Exporta SPAs a archivo Excel.

    Genera archivo .xlsx con:
    - Todas las columnas de SPA
    - Nombre del cliente
    - Filtros aplicados según parámetros

    Args:
        client_id: Filtrar por cliente (opcional)
        active_only: Solo SPAs activos
        tenant_id: ID del tenant
        db: Sesión de base de datos
        spa_service: Servicio de SPA

    Returns:
        StreamingResponse con archivo Excel
    """
    try:
        import pandas as pd
        from datetime import datetime

        # Obtener datos
        params = SPASearchParams(
            page=1,
            page_size=10000,  # Export all
            client_id=client_id,
            active_only=active_only
        )

        result = await spa_service.list_spas(params, current_user.tenant_id, db)

        # Convertir a DataFrame
        data = []
        for spa in result.items:
            data.append({
                'BPID': spa.bpid,
                'Ship To Name': spa.ship_to_name,
                'Article Number': spa.article_number,
                'Article Description': spa.article_description or '',
                'List Price': float(spa.list_price),
                'App Net Price': float(spa.app_net_price),
                'Discount %': float(spa.discount_percent),
                'UOM': spa.uom,
                'Start Date': spa.start_date.isoformat(),
                'End Date': spa.end_date.isoformat(),
                'Is Active': spa.is_active,
                'Created At': spa.created_at.isoformat()
            })

        df = pd.DataFrame(data)

        # Generar Excel en memoria
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='SPAs', index=False)

        output.seek(0)

        # Generar nombre de archivo
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"spas_export_{timestamp}.xlsx"

        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except Exception as e:
        logger.error(f"Error exporting SPAs: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export SPAs"
        )


@router.delete("/{spa_id}")
async def delete_spa(
    spa_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    spa_service: SPAService = Depends(get_spa_service)
):
    """
    Soft delete de SPA.

    Marca el SPA como eliminado sin borrarlo físicamente.
    Útil para auditoría y trazabilidad.

    Args:
        spa_id: UUID del SPA a eliminar
        tenant_id: ID del tenant
        db: Sesión de base de datos
        spa_service: Servicio de SPA

    Returns:
        Confirmación de eliminación

    Raises:
        404: Si el SPA no existe
    """
    try:
        deleted = await spa_service.delete_spa(spa_id, current_user.tenant_id, db)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"SPA {spa_id} not found"
            )

        await db.commit()

        return {"message": "SPA deleted successfully", "spa_id": str(spa_id)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting SPA: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete SPA"
        )


@router.get("/uploads/history", response_model=List[SPAUploadLogResponse])
async def get_upload_history(
    limit: int = Query(20, ge=1, le=100, description="Número de uploads a retornar"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    spa_service: SPAService = Depends(get_spa_service)
):
    """
    Obtiene historial de uploads de archivos SPA.

    Útil para:
    - Auditoría de imports
    - Ver errores de uploads pasados
    - Rastrear quién subió qué archivo

    Args:
        limit: Cantidad máxima de registros (default: 20, max: 100)
        tenant_id: ID del tenant
        db: Sesión de base de datos
        spa_service: Servicio de SPA

    Returns:
        Lista de SPAUploadLogResponse ordenada por fecha (más reciente primero)
    """
    try:
        logs = await spa_service.get_upload_history(tenant_id, limit, db)
        return [SPAUploadLogResponse.from_orm(log) for log in logs]

    except Exception as e:
        logger.error(f"Error getting upload history: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get upload history"
        )

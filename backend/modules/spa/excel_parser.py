"""
Excel Parser Service para archivos SPA
Soporta .xls, .xlsx, .tsv con validación robusta.
"""
from typing import List, Tuple, Optional
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
import logging
import io

import pandas as pd
from fastapi import UploadFile

from modules.spa.schemas import SPARowData
from modules.spa.exceptions import SPAFileInvalidException

logger = logging.getLogger(__name__)


class ExcelParserService:
    """Servicio para parsear archivos Excel/TSV de SPAs."""

    # Mapeo de columnas esperadas (case-insensitive)
    COLUMN_MAPPING = {
        'bpid': ['bpid', 'bp_id', 'business_partner_id'],
        'ship_to_name': ['ship_to_name', 'ship_to', 'customer_name', 'client_name'],
        'article_number': ['article_number', 'article', 'part_number', 'sku'],
        'article_description': ['article_description', 'description', 'product_description'],
        'list_price': ['list_price', 'list', 'listprice'],
        'app_net_price': ['app_net_price', 'net_price', 'approved_price', 'app_price'],
        'uom': ['uom', 'unit', 'unit_of_measure'],
        'start_date': ['start_date', 'startdate', 'effective_date'],
        'end_date': ['end_date', 'enddate', 'expiration_date']
    }

    REQUIRED_COLUMNS = [
        'bpid',
        'ship_to_name',
        'article_number',
        'list_price',
        'app_net_price',
        'start_date',
        'end_date'
    ]

    @staticmethod
    async def parse_file(file: UploadFile) -> Tuple[List[SPARowData], List[dict]]:
        """
        Parsea archivo y retorna registros válidos y errores.

        Args:
            file: Archivo Excel/TSV subido

        Returns:
            Tupla de (registros válidos, lista de errores)

        Raises:
            SPAFileInvalidException: Si el archivo no puede ser leído
        """
        valid_records: List[SPARowData] = []
        errors: List[dict] = []

        try:
            # Leer archivo según extensión
            file_ext = file.filename.split('.')[-1].lower()
            content = await file.read()

            if file_ext == 'tsv':
                df = pd.read_csv(io.BytesIO(content), sep='\t')
            elif file_ext in ['xls', 'xlsx']:
                df = pd.read_excel(io.BytesIO(content))
            else:
                raise SPAFileInvalidException(f"Unsupported file type: {file_ext}")

            logger.info(f"Read {len(df)} rows from file {file.filename}")

            # Validar columnas
            validation_result = ExcelParserService.validate_columns(df)
            if not validation_result['valid']:
                raise SPAFileInvalidException(
                    f"Missing required columns: {validation_result['missing']}"
                )

            # Normalizar nombres de columnas
            df = ExcelParserService._normalize_columns(df)

            # Parsear cada fila
            for idx, row in df.iterrows():
                row_number = idx + 2  # Excel rows start at 1, header is row 1

                row_data, error = ExcelParserService.parse_row(
                    row.to_dict(),
                    row_number
                )

                if error:
                    errors.append(error)
                else:
                    valid_records.append(row_data)

            logger.info(
                f"Parsing complete: {len(valid_records)} valid, {len(errors)} errors"
            )

            return valid_records, errors

        except pd.errors.EmptyDataError:
            raise SPAFileInvalidException("File is empty")
        except pd.errors.ParserError as e:
            raise SPAFileInvalidException(f"Failed to parse file: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error parsing file: {str(e)}", exc_info=True)
            raise SPAFileInvalidException(f"Failed to read file: {str(e)}")

    @staticmethod
    def validate_columns(df: pd.DataFrame) -> dict:
        """
        Valida que columnas requeridas existan en el DataFrame.

        Args:
            df: DataFrame de pandas

        Returns:
            Dict con 'valid' (bool) y 'missing' (list de columnas faltantes)
        """
        df_columns_lower = [col.lower().strip() for col in df.columns]

        missing_columns = []

        for required_col in ExcelParserService.REQUIRED_COLUMNS:
            possible_names = ExcelParserService.COLUMN_MAPPING.get(
                required_col,
                [required_col]
            )

            found = any(
                name.lower() in df_columns_lower
                for name in possible_names
            )

            if not found:
                missing_columns.append(required_col)

        return {
            'valid': len(missing_columns) == 0,
            'missing': missing_columns
        }

    @staticmethod
    def parse_row(row: dict, row_number: int) -> Tuple[Optional[SPARowData], Optional[dict]]:
        """
        Parsea una fila individual del DataFrame.

        Args:
            row: Diccionario con datos de la fila
            row_number: Número de fila para error reporting

        Returns:
            Tupla de (SPARowData o None, error dict o None)
        """
        try:
            # Extraer y validar campos
            bpid = ExcelParserService._parse_string(row, 'bpid', required=True)
            ship_to_name = ExcelParserService._parse_string(
                row,
                'ship_to_name',
                required=True
            )
            article_number = ExcelParserService._parse_string(
                row,
                'article_number',
                required=True
            )
            article_description = ExcelParserService._parse_string(
                row,
                'article_description',
                required=False
            )
            list_price = ExcelParserService._parse_decimal(
                row,
                'list_price',
                required=True
            )
            app_net_price = ExcelParserService._parse_decimal(
                row,
                'app_net_price',
                required=True
            )
            uom = ExcelParserService._parse_string(row, 'uom', required=False) or 'EA'
            start_date = ExcelParserService._parse_date(row, 'start_date', required=True)
            end_date = ExcelParserService._parse_date(row, 'end_date', required=True)

            # Validaciones de negocio
            if list_price <= 0:
                raise ValueError(f"list_price must be greater than 0, got {list_price}")

            if app_net_price < 0:
                raise ValueError(f"app_net_price cannot be negative, got {app_net_price}")

            if end_date < start_date:
                raise ValueError(
                    f"end_date ({end_date}) cannot be before start_date ({start_date})"
                )

            # Crear objeto
            spa_data = SPARowData(
                bpid=bpid,
                ship_to_name=ship_to_name,
                article_number=article_number,
                article_description=article_description,
                list_price=list_price,
                app_net_price=app_net_price,
                uom=uom,
                start_date=start_date,
                end_date=end_date
            )

            return spa_data, None

        except Exception as e:
            error = {
                'row': row_number,
                'bpid': row.get('bpid', 'N/A'),
                'article': row.get('article_number', 'N/A'),
                'error': str(e)
            }
            return None, error

    # --- Helper Methods ---

    @staticmethod
    def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
        """
        Normaliza nombres de columnas según COLUMN_MAPPING.

        Args:
            df: DataFrame original

        Returns:
            DataFrame con columnas normalizadas
        """
        column_map = {}

        for col in df.columns:
            col_lower = col.lower().strip()

            # Buscar en mapping
            for standard_name, variants in ExcelParserService.COLUMN_MAPPING.items():
                if col_lower in [v.lower() for v in variants]:
                    column_map[col] = standard_name
                    break

        df = df.rename(columns=column_map)
        return df

    @staticmethod
    def _parse_string(row: dict, key: str, required: bool = True) -> Optional[str]:
        """Parsea campo de texto."""
        value = row.get(key)

        if pd.isna(value) or value is None or str(value).strip() == '':
            if required:
                raise ValueError(f"Missing required field: {key}")
            return None

        return str(value).strip()

    @staticmethod
    def _parse_decimal(row: dict, key: str, required: bool = True) -> Optional[Decimal]:
        """Parsea campo decimal."""
        value = row.get(key)

        if pd.isna(value) or value is None or value == '':
            if required:
                raise ValueError(f"Missing required field: {key}")
            return None

        try:
            # Limpiar formato (quitar comas, espacios)
            if isinstance(value, str):
                value = value.replace(',', '').replace(' ', '')

            return Decimal(str(value))
        except (InvalidOperation, ValueError) as e:
            raise ValueError(f"Invalid decimal value for {key}: {value}. Error: {e}")

    @staticmethod
    def _parse_date(row: dict, key: str, required: bool = True) -> Optional[date]:
        """Parsea campo de fecha."""
        value = row.get(key)

        if pd.isna(value) or value is None or value == '':
            if required:
                raise ValueError(f"Missing required field: {key}")
            return None

        try:
            # Si ya es datetime/date de pandas
            if isinstance(value, (pd.Timestamp, datetime)):
                return value.date()

            # Si es string, intentar parsear
            if isinstance(value, str):
                parsed = pd.to_datetime(value)
                return parsed.date()

            # Si es otro tipo, intentar convertir
            parsed = pd.to_datetime(str(value))
            return parsed.date()

        except Exception as e:
            raise ValueError(f"Invalid date value for {key}: {value}. Error: {e}")

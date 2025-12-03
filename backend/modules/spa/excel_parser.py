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
        'bpid': ['bpid', 'bp_id', 'business_partner_id', 'sold-to id', 'soldto id', 'end customer id'],
        'ship_to_name': ['ship_to_name', 'ship_to', 'customer_name', 'client_name', 'ship-to name', 'shipto name', 'sold-to name'],
        'article_number': ['article_number', 'article', 'part_number', 'sku', 'material', 'catalog no', 'catalog no.'],
        'article_description': ['article_description', 'description', 'product_description'],
        'list_price': ['list_price', 'list', 'listprice', 'list price'],
        'app_net_price': ['app_net_price', 'net_price', 'approved_price', 'app_price', 'app calctd net price', 'approved net price'],
        'uom': ['uom', 'unit', 'unit_of_measure'],
        'start_date': ['start_date', 'startdate', 'effective_date', 'valid from', 'validfrom'],
        'end_date': ['end_date', 'enddate', 'expiration_date', 'valid to', 'validto']
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

            # Detectar formato real del archivo (muchos .xls son en realidad HTML/CSV)
            df = await ExcelParserService._read_file_smart(content, file_ext, file.filename)

            logger.info(f"Read {len(df)} rows from file {file.filename}")

            # Log actual columns found in the file
            actual_columns = df.columns.tolist()
            logger.info(f"Actual columns in file: {actual_columns}")

            # Validar columnas
            validation_result = ExcelParserService.validate_columns(df)
            if not validation_result['valid']:
                logger.error(
                    f"Column validation failed. "
                    f"Expected columns: {ExcelParserService.REQUIRED_COLUMNS}, "
                    f"Actual columns: {actual_columns}, "
                    f"Missing: {validation_result['missing']}"
                )
                raise SPAFileInvalidException(
                    f"Missing required columns: {validation_result['missing']}. "
                    f"Found columns: {actual_columns}"
                )

            # Normalizar nombres de columnas ANTES del preprocessing jerárquico
            df = ExcelParserService._normalize_columns(df)
            logger.info(f"Columns after normalization: {df.columns.tolist()}")

            # Pre-process hierarchical format (SAP-style) - DESPUÉS de normalizar
            df = ExcelParserService._preprocess_hierarchical_format(df)
            logger.info(f"After hierarchical preprocessing: {len(df)} rows")

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
    async def _read_file_smart(content: bytes, file_ext: str, filename: str) -> pd.DataFrame:
        """
        Lee un archivo detectando automáticamente su formato real.

        Muchos archivos .xls son en realidad HTML o CSV disfrazados.
        Este método detecta el formato real e intenta leerlo apropiadamente.

        Args:
            content: Contenido binario del archivo
            file_ext: Extensión del archivo (.xls, .xlsx, .tsv)
            filename: Nombre del archivo para logging

        Returns:
            DataFrame con los datos del archivo

        Raises:
            SPAFileInvalidException: Si no se puede leer el archivo
        """
        buffer = io.BytesIO(content)

        # Detectar si el archivo es realmente HTML (común en .xls falsos)
        content_start = content[:100].decode('utf-8', errors='ignore').lower()

        # Intentar leer como HTML si detectamos tags HTML
        if '<html' in content_start or '<table' in content_start or '<!doctype' in content_start:
            logger.info(f"File {filename} detected as HTML format, reading with read_html")
            try:
                # read_html retorna una lista de DataFrames, tomamos el primero
                dfs = pd.read_html(io.BytesIO(content))
                if not dfs:
                    raise SPAFileInvalidException("No tables found in HTML file")
                return dfs[0]  # Retornar la primera tabla
            except Exception as e:
                raise SPAFileInvalidException(f"Failed to read HTML file: {str(e)}")

        # Intentar leer como TSV
        if file_ext == 'tsv':
            try:
                return pd.read_csv(buffer, sep='\t')
            except Exception as e:
                raise SPAFileInvalidException(f"Failed to read TSV file: {str(e)}")

        # Intentar leer como Excel real (.xls o .xlsx)
        if file_ext in ['xls', 'xlsx']:
            # Primero intentar con el motor apropiado según extensión
            engine = 'xlrd' if file_ext == 'xls' else 'openpyxl'

            try:
                return pd.read_excel(buffer, engine=engine)
            except Exception as excel_error:
                logger.warning(f"Failed to read as Excel with {engine}: {str(excel_error)}")

                # Si falla, intentar detectar si es CSV/TSV disfrazado
                buffer.seek(0)

                # Primero intentar como TSV (tab-separated)
                try:
                    logger.info(f"Trying to read {filename} as TSV (tab-separated)")
                    buffer.seek(0)
                    return pd.read_csv(buffer, sep='\t', encoding='utf-8')
                except Exception as tsv_error:
                    logger.warning(f"Failed to read as TSV: {str(tsv_error)}")

                    # Luego intentar como CSV (comma-separated)
                    try:
                        logger.info(f"Trying to read {filename} as CSV (comma-separated)")
                        buffer.seek(0)
                        return pd.read_csv(buffer, encoding='utf-8')
                    except Exception as csv_error:
                        # Intentar con diferentes encodings
                        try:
                            logger.info(f"Trying to read {filename} with latin-1 encoding")
                            buffer.seek(0)
                            return pd.read_csv(buffer, sep='\t', encoding='latin-1')
                        except Exception:
                            # Si todo falla, reportar el error original de Excel
                            raise SPAFileInvalidException(
                                f"Failed to read file: {str(excel_error)}. "
                                f"Also failed as TSV/CSV. File may be corrupted or in an unsupported format."
                            )

        raise SPAFileInvalidException(f"Unsupported file type: {file_ext}")

    @staticmethod
    def _preprocess_hierarchical_format(df: pd.DataFrame) -> pd.DataFrame:
        """
        Pre-process hierarchical SAP format where:
        - First row has customer (bpid, ship_to_name) but no product (material)
        - Following rows have products but no customer

        This method expands customer info to all product rows.

        Args:
            df: DataFrame with hierarchical format

        Returns:
            DataFrame with expanded format (customer in every row)
        """
        # Check if we need to do hierarchical expansion
        # Look for common customer/product column patterns
        customer_cols = ['bpid', 'bp_id', 'sold-to id', 'soldto id', 'end customer id',
                        'ship_to_name', 'ship-to name', 'shipto name', 'sold-to name']
        product_cols = ['article_number', 'material', 'catalog no', 'catalog no.', 'part_number', 'sku']

        # Normalize column names for detection
        df_cols_lower = {col.lower().strip(): col for col in df.columns}

        # Find actual column names
        customer_col = None
        product_col = None

        for col_variant in customer_cols:
            if col_variant in df_cols_lower:
                customer_col = df_cols_lower[col_variant]
                break

        for col_variant in product_cols:
            if col_variant in df_cols_lower:
                product_col = df_cols_lower[col_variant]
                break

        # If we don't have both customer and product columns, skip preprocessing
        if not customer_col or not product_col:
            logger.info("Hierarchical format not detected, skipping preprocessing")
            return df

        logger.info(f"Detected hierarchical format with customer='{customer_col}', product='{product_col}'")

        # Process rows: expand customer to product rows
        expanded_rows = []
        current_customer_data = {}

        for idx, row in df.iterrows():
            # Safely check if customer and product columns have values
            try:
                customer_val = row[customer_col]
                has_customer = pd.notna(customer_val)
            except (KeyError, IndexError):
                has_customer = False

            try:
                product_val = row[product_col]
                has_product = pd.notna(product_val)
            except (KeyError, IndexError):
                has_product = False

            if (has_customer is True) and (has_product is False):
                # This is a customer header row - save customer data
                logger.debug(f"Row {idx + 1}: Found customer header - {row[customer_col]}")
                current_customer_data = row.to_dict()

            elif (has_product is True):
                # This is a product row
                if current_customer_data:
                    # Merge customer data with product data
                    # Strategy: Start with customer data, then override with product data ONLY for non-NaN values
                    merged_row = current_customer_data.copy()
                    product_row = row.to_dict()

                    # Override customer values with product values, but only if product value is not NaN
                    for key, val in product_row.items():
                        if pd.notna(val):
                            merged_row[key] = val

                    expanded_rows.append(merged_row)
                    logger.debug(f"Row {idx + 1}: Merged product with customer")
                else:
                    # Product row without customer - keep as is
                    expanded_rows.append(row.to_dict())
                    logger.debug(f"Row {idx + 1}: Product without customer header")

            elif (has_customer is True) and (has_product is True):
                # Row has both - normal format, keep as is
                expanded_rows.append(row.to_dict())
                current_customer_data = {}  # Reset

        if not expanded_rows:
            logger.warning("Hierarchical preprocessing resulted in 0 rows, returning original")
            return df

        # Create new DataFrame from expanded rows
        df_expanded = pd.DataFrame(expanded_rows)

        logger.info(
            f"Hierarchical expansion: {len(df)} -> {len(df_expanded)} rows "
            f"(removed {len(df) - len(df_expanded)} customer-only rows)"
        )

        return df_expanded

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
            # Helper to safely get value (convert NaN to 'N/A')
            def safe_get(key):
                val = row.get(key, 'N/A')
                if pd.isna(val):
                    return 'N/A'
                return str(val) if val is not None else 'N/A'

            error = {
                'row': row_number,
                'bpid': safe_get('bpid'),
                'article': safe_get('article_number'),
                'error': str(e)
            }
            return None, error

    # --- Helper Methods ---

    @staticmethod
    def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
        """
        Normaliza nombres de columnas según COLUMN_MAPPING.
        Si hay duplicados (múltiples columnas que mapean al mismo nombre estándar),
        solo toma la primera coincidencia basándose en el orden de prioridad en las variantes.

        Args:
            df: DataFrame original

        Returns:
            DataFrame con columnas normalizadas (sin duplicados)
        """
        column_map = {}
        already_mapped = set()  # Track which standard names are already mapped

        for col in df.columns:
            col_lower = col.lower().strip()

            # Buscar en mapping
            for standard_name, variants in ExcelParserService.COLUMN_MAPPING.items():
                # Skip if this standard_name is already mapped
                if standard_name in already_mapped:
                    continue

                # Check if this column matches any variant for this standard name
                if col_lower in [v.lower() for v in variants]:
                    column_map[col] = standard_name
                    already_mapped.add(standard_name)
                    logger.debug(f"Mapped column '{col}' -> '{standard_name}'")
                    break

        df = df.rename(columns=column_map)
        logger.info(f"Normalized {len(column_map)} columns (avoided duplicates)")
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

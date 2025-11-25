"""
Excel/CSV Parser for SPA Analytics
Handles file validation, parsing, and data cleaning
"""
import pandas as pd
import numpy as np
from typing import Tuple, Dict, List, Optional
from pathlib import Path
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ExcelParser:
    """
    Parser for Excel and CSV files containing sales data

    Validates files, detects column mappings, and cleans data for analysis.
    Handles various column name variations and data quality issues.
    """

    # Required columns for analysis (at least one variation must be present)
    REQUIRED_COLUMNS = {
        "product": ["product", "producto", "articulo", "item", "descripcion", "description", "nombre"],
        "quantity": ["quantity", "cantidad", "qty", "unidades", "units", "piezas"],
        "unit_price": ["unit_price", "precio", "price", "precio_unitario", "unit price", "price_per_unit"],
    }

    # Optional columns for enhanced analysis
    OPTIONAL_COLUMNS = {
        "client": ["client", "cliente", "customer", "comprador", "buyer"],
        "date": ["date", "fecha", "timestamp", "fecha_venta", "sale_date"],
        "discount": ["discount", "descuento", "disc", "discount_pct", "discount_percentage"],
        "cost": ["cost", "costo", "unit_cost", "costo_unitario", "cost_per_unit"],
    }

    # Maximum file size (50MB)
    MAX_FILE_SIZE = 50 * 1024 * 1024

    # Supported file extensions
    SUPPORTED_EXTENSIONS = {".xlsx", ".xls", ".csv"}

    @staticmethod
    def validate_file(file_path: str) -> Tuple[bool, str]:
        """
        Validate file before processing

        Args:
            file_path: Path to the file to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        path = Path(file_path)

        # Check if file exists
        if not path.exists():
            return False, f"File not found: {file_path}"

        # Check file extension
        if path.suffix.lower() not in ExcelParser.SUPPORTED_EXTENSIONS:
            return False, f"Unsupported file format. Supported: {', '.join(ExcelParser.SUPPORTED_EXTENSIONS)}"

        # Check file size
        file_size = path.stat().st_size
        if file_size > ExcelParser.MAX_FILE_SIZE:
            max_mb = ExcelParser.MAX_FILE_SIZE / (1024 * 1024)
            actual_mb = file_size / (1024 * 1024)
            return False, f"File too large: {actual_mb:.2f}MB (max: {max_mb}MB)"

        # Check if file is empty
        if file_size == 0:
            return False, "File is empty"

        return True, ""

    @staticmethod
    def detect_column_mapping(df: pd.DataFrame) -> Dict[str, str]:
        """
        Auto-detect column mapping based on column names

        Args:
            df: DataFrame with original column names

        Returns:
            Dictionary mapping standard names to actual column names
        """
        mapping = {}
        columns_lower = {col.lower().strip(): col for col in df.columns}

        # Map required columns
        for standard_name, variations in ExcelParser.REQUIRED_COLUMNS.items():
            for variation in variations:
                if variation in columns_lower:
                    mapping[standard_name] = columns_lower[variation]
                    break

        # Map optional columns
        for standard_name, variations in ExcelParser.OPTIONAL_COLUMNS.items():
            for variation in variations:
                if variation in columns_lower:
                    mapping[standard_name] = columns_lower[variation]
                    break

        logger.info(f"Detected column mapping: {mapping}")
        return mapping

    @staticmethod
    def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and prepare DataFrame for analysis

        Args:
            df: Raw DataFrame

        Returns:
            Cleaned DataFrame
        """
        # Create a copy to avoid modifying original
        df = df.copy()

        # Remove completely empty rows
        df = df.dropna(how="all")

        # Remove duplicate rows
        initial_rows = len(df)
        df = df.drop_duplicates()
        duplicates_removed = initial_rows - len(df)
        if duplicates_removed > 0:
            logger.info(f"Removed {duplicates_removed} duplicate rows")

        # Reset index
        df = df.reset_index(drop=True)

        return df

    @staticmethod
    def parse(file_path: str) -> pd.DataFrame:
        """
        Parse Excel or CSV file into a clean DataFrame

        Args:
            file_path: Path to the file to parse

        Returns:
            Parsed and cleaned DataFrame

        Raises:
            ValueError: If file is invalid or missing required columns
            Exception: For parsing errors
        """
        # Validate file first
        is_valid, error_msg = ExcelParser.validate_file(file_path)
        if not is_valid:
            raise ValueError(error_msg)

        path = Path(file_path)
        extension = path.suffix.lower()

        try:
            # Read file based on extension
            if extension == ".csv":
                # Try different encodings and separators
                df = ExcelParser._read_csv_robust(file_path)
            else:
                # Read Excel file
                df = pd.read_excel(file_path, engine="openpyxl" if extension == ".xlsx" else "xlrd")

            logger.info(f"Read {len(df)} rows from {file_path}")

            # Detect column mapping
            column_mapping = ExcelParser.detect_column_mapping(df)

            # Validate required columns are present
            missing_columns = []
            for required in ExcelParser.REQUIRED_COLUMNS.keys():
                if required not in column_mapping:
                    variations = ", ".join(ExcelParser.REQUIRED_COLUMNS[required][:3])
                    missing_columns.append(f"{required} (expected: {variations})")

            if missing_columns:
                raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")

            # Rename columns to standard names
            reverse_mapping = {v: k for k, v in column_mapping.items()}
            df = df.rename(columns=reverse_mapping)

            # Keep only mapped columns
            columns_to_keep = list(column_mapping.keys())
            df = df[columns_to_keep]

            # Clean the dataframe
            df = ExcelParser.clean_dataframe(df)

            # Convert data types
            df = ExcelParser._convert_data_types(df)

            # Calculate derived columns
            df = ExcelParser._calculate_derived_columns(df)

            # Final validation
            ExcelParser._validate_data(df)

            logger.info(f"Successfully parsed {len(df)} rows with columns: {list(df.columns)}")
            return df

        except Exception as e:
            logger.error(f"Error parsing file {file_path}: {str(e)}")
            raise

    @staticmethod
    def _read_csv_robust(file_path: str) -> pd.DataFrame:
        """
        Read CSV with robust encoding and separator detection

        Args:
            file_path: Path to CSV file

        Returns:
            DataFrame
        """
        encodings = ["utf-8", "latin-1", "iso-8859-1", "cp1252"]
        separators = [",", ";", "\t", "|"]

        for encoding in encodings:
            for separator in separators:
                try:
                    df = pd.read_csv(file_path, encoding=encoding, sep=separator)
                    # Check if we got reasonable column count
                    if len(df.columns) > 1:
                        logger.info(f"CSV read with encoding={encoding}, separator={separator}")
                        return df
                except Exception:
                    continue

        # If all attempts failed, try with default settings
        return pd.read_csv(file_path)

    @staticmethod
    def _convert_data_types(df: pd.DataFrame) -> pd.DataFrame:
        """
        Convert columns to appropriate data types

        Args:
            df: DataFrame with standard column names

        Returns:
            DataFrame with converted types
        """
        df = df.copy()

        # Convert numeric columns
        numeric_columns = ["quantity", "unit_price", "discount", "cost"]
        for col in numeric_columns:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Convert date column
        if "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"], errors="coerce")

        # Convert text columns to string
        text_columns = ["product", "client"]
        for col in text_columns:
            if col in df.columns:
                df[col] = df[col].astype(str).str.strip()

        # Remove rows with invalid required fields
        required_numeric = ["quantity", "unit_price"]
        for col in required_numeric:
            df = df[df[col].notna()]
            df = df[df[col] > 0]  # Must be positive

        return df

    @staticmethod
    def _calculate_derived_columns(df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate derived columns from existing data

        Args:
            df: DataFrame with base columns

        Returns:
            DataFrame with derived columns added
        """
        df = df.copy()

        # Calculate total sales (quantity * unit_price)
        df["total"] = df["quantity"] * df["unit_price"]

        # Calculate discount amount if discount percentage exists
        if "discount" in df.columns:
            # Fill NaN discounts with 0
            df["discount"] = df["discount"].fillna(0)
            df["discount_amount"] = df["total"] * (df["discount"] / 100)
            df["total_after_discount"] = df["total"] - df["discount_amount"]
        else:
            df["discount_amount"] = 0
            df["total_after_discount"] = df["total"]

        # Calculate margin if cost exists
        if "cost" in df.columns:
            df["cost"] = df["cost"].fillna(0)
            df["total_cost"] = df["quantity"] * df["cost"]
            df["margin"] = df["total_after_discount"] - df["total_cost"]
            df["margin_pct"] = np.where(
                df["total_after_discount"] > 0,
                (df["margin"] / df["total_after_discount"]) * 100,
                0,
            )

        return df

    @staticmethod
    def _validate_data(df: pd.DataFrame) -> None:
        """
        Validate data quality

        Args:
            df: DataFrame to validate

        Raises:
            ValueError: If data quality issues are found
        """
        # Check for empty dataframe
        if len(df) == 0:
            raise ValueError("No valid data rows found after cleaning")

        # Check for negative values
        numeric_columns = ["quantity", "unit_price", "total"]
        for col in numeric_columns:
            if col in df.columns:
                negative_count = (df[col] < 0).sum()
                if negative_count > 0:
                    logger.warning(f"Found {negative_count} negative values in {col}")

        # Check for outliers (values > 10 standard deviations)
        for col in ["unit_price", "quantity"]:
            if col in df.columns:
                mean = df[col].mean()
                std = df[col].std()
                if std > 0:
                    outliers = df[abs(df[col] - mean) > 10 * std]
                    if len(outliers) > 0:
                        logger.warning(f"Found {len(outliers)} potential outliers in {col}")

        logger.info("Data validation completed")

    @staticmethod
    def get_column_info(df: pd.DataFrame) -> Dict[str, Dict[str, any]]:
        """
        Get information about each column

        Args:
            df: DataFrame to analyze

        Returns:
            Dictionary with column information
        """
        info = {}

        for col in df.columns:
            info[col] = {
                "type": str(df[col].dtype),
                "null_count": int(df[col].isna().sum()),
                "null_percentage": float(df[col].isna().sum() / len(df) * 100),
                "unique_count": int(df[col].nunique()),
            }

            # Add statistics for numeric columns
            if pd.api.types.is_numeric_dtype(df[col]):
                info[col].update(
                    {
                        "min": float(df[col].min()),
                        "max": float(df[col].max()),
                        "mean": float(df[col].mean()),
                        "median": float(df[col].median()),
                    }
                )

        return info

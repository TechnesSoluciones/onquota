"""
Core constants for the application
Centralized place for commonly used constants across modules
"""
from typing import Literal

# ============================================================================
# Currency Constants
# ============================================================================

# Supported currencies (ISO 4217 codes)
SUPPORTED_CURRENCIES = Literal["USD", "EUR", "COP", "MXN", "BRL", "DOP"]

# Currency codes as list (for validation)
CURRENCY_CODES = ["USD", "EUR", "COP", "MXN", "BRL", "DOP"]

# Currency display names
CURRENCY_NAMES = {
    "USD": "US Dollar - Dólar Americano",
    "EUR": "Euro",
    "COP": "Colombian Peso - Peso Colombiano",
    "MXN": "Mexican Peso - Peso Mexicano",
    "BRL": "Brazilian Real - Real Brasileño",
    "DOP": "Dominican Peso - Peso Dominicano",
}

# Currency symbols
CURRENCY_SYMBOLS = {
    "USD": "$",
    "EUR": "€",
    "COP": "$",
    "MXN": "$",
    "BRL": "R$",
    "DOP": "RD$",
}

# Default currency
DEFAULT_CURRENCY = "USD"

# ============================================================================
# API Constants
# ============================================================================

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# File Upload
MAX_FILE_SIZE_MB = 10
ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".bmp"]
ALLOWED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx"]

# ============================================================================
# Business Constants
# ============================================================================

# Date formats
DATE_FORMAT = "%Y-%m-%d"
DATETIME_FORMAT = "%Y-%m-%d %H:%M:%S"

# Status
ACTIVE_STATUS = "active"
INACTIVE_STATUS = "inactive"

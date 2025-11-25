"""
OCR Engine for text extraction and intelligent data parsing
Uses Tesseract OCR with smart pattern matching for receipts/invoices
"""
import re
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import Optional, Tuple, List, Dict
import numpy as np
import pytesseract
from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


class OCREngine:
    """
    OCR Engine with Tesseract and intelligent data extraction
    Extracts structured data from receipt/invoice text
    """

    # Known providers database (expandable)
    KNOWN_PROVIDERS = {
        "texaco", "shell", "mobil", "chevron", "exxon", "bp", "gulf",  # Gas stations
        "hilton", "marriott", "hyatt", "holiday inn", "best western", "radisson",  # Hotels
        "hertz", "avis", "enterprise", "budget", "national", "alamo",  # Car rental
        "uber", "lyft", "cabify",  # Transport
        "walmart", "target", "costco", "amazon",  # Retail
        "home depot", "lowes",  # Hardware
        "office depot", "staples",  # Office supplies
    }

    # Category keywords mapping
    CATEGORY_KEYWORDS = {
        "COMBUSTIBLE": ["gasolina", "gasoline", "diesel", "fuel", "gas station", "petrol"],
        "TRANSPORTE": ["taxi", "uber", "lyft", "bus", "metro", "transporte", "transport", "peaje", "toll"],
        "ALOJAMIENTO": ["hotel", "motel", "inn", "lodge", "hospedaje", "lodging", "accommodation"],
        "ALIMENTACION": ["restaurant", "restaurante", "food", "comida", "cafe", "coffee", "lunch", "dinner"],
        "OFICINA": ["office", "oficina", "supplies", "papeleria", "stationery"],
        "MANTENIMIENTO": ["repair", "reparacion", "maintenance", "mantenimiento", "service"],
        "EQUIPAMIENTO": ["equipment", "equipo", "hardware", "herramienta", "tool"],
        "OTROS": [],  # Default fallback
    }

    # Currency symbols mapping
    CURRENCY_SYMBOLS = {
        "$": "USD",
        "USD": "USD",
        "€": "EUR",
        "EUR": "EUR",
        "£": "GBP",
        "GBP": "GBP",
        "¥": "JPY",
        "JPY": "JPY",
    }

    def __init__(self, lang: str = None):
        """
        Initialize OCR Engine

        Args:
            lang: Tesseract language (default from settings)
        """
        self.lang = lang or settings.TESSERACT_LANG
        self.tesseract_path = settings.TESSERACT_PATH

        # Set tesseract path if specified
        if self.tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = self.tesseract_path

        logger.info(f"OCREngine initialized with language: {self.lang}")

    async def extract_text(self, image: np.ndarray) -> str:
        """
        Extract raw text from image using Tesseract

        Args:
            image: Preprocessed image as numpy array

        Returns:
            Raw extracted text

        Raises:
            RuntimeError: If Tesseract fails
        """
        try:
            # Configure Tesseract for receipt/invoice reading
            custom_config = r"--oem 3 --psm 6"  # OEM 3 = Default, PSM 6 = Assume uniform block of text

            text = pytesseract.image_to_string(
                image,
                lang=self.lang,
                config=custom_config,
            )

            logger.info(f"Extracted {len(text)} characters from image")
            logger.debug(f"Raw text: {text[:500]}...")  # Log first 500 chars

            return text.strip()

        except Exception as e:
            logger.error(f"Tesseract extraction failed: {e}")
            raise RuntimeError(f"OCR extraction failed: {str(e)}")

    async def extract_structured_data(self, text: str) -> Tuple[dict, float]:
        """
        Parse raw text into structured data

        Args:
            text: Raw OCR text

        Returns:
            Tuple of (extracted_data dict, confidence score)
        """
        logger.info("Extracting structured data from text")

        # Normalize text
        text_lower = text.lower()

        # Extract individual fields
        provider, provider_conf = self._detect_provider(text_lower, text)
        amount, currency, amount_conf = self._extract_amount(text)
        date_val, date_conf = self._extract_date(text)
        category = self._classify_category(text_lower, provider)
        receipt_num = self._extract_receipt_number(text)
        items = self._extract_items(text)
        tax_amount, subtotal = self._extract_tax_and_subtotal(text, amount)

        # Calculate overall confidence (weighted average)
        confidence = (
            provider_conf * 0.3 +
            amount_conf * 0.4 +
            date_conf * 0.3
        )

        # Build structured data
        extracted_data = {
            "provider": provider,
            "amount": float(amount) if amount else None,
            "currency": currency,
            "date": date_val.isoformat() if date_val else None,
            "category": category,
            "receipt_number": receipt_num,
            "items": items,
            "tax_amount": float(tax_amount) if tax_amount else None,
            "subtotal": float(subtotal) if subtotal else None,
        }

        logger.info(f"Extracted data with confidence {confidence:.3f}: {extracted_data}")

        return extracted_data, confidence

    def _detect_provider(self, text_lower: str, text_original: str) -> Tuple[Optional[str], float]:
        """
        Detect provider name from text

        Args:
            text_lower: Lowercase text for matching
            text_original: Original text for extraction

        Returns:
            Tuple of (provider name, confidence)
        """
        # Check against known providers
        for provider in self.KNOWN_PROVIDERS:
            if provider in text_lower:
                # Extract capitalized version from original text
                pattern = re.compile(re.escape(provider), re.IGNORECASE)
                match = pattern.search(text_original)
                if match:
                    provider_name = match.group(0).upper()
                    logger.debug(f"Detected known provider: {provider_name}")
                    return provider_name, 0.95

        # Try to extract from first lines (providers usually at top)
        lines = text_original.split("\n")
        for line in lines[:5]:  # Check first 5 lines
            line = line.strip()
            if len(line) > 3 and len(line) < 50:  # Reasonable provider name length
                # Skip lines that are obviously not provider names
                if any(keyword in line.lower() for keyword in ["total", "subtotal", "tax", "date", "invoice"]):
                    continue

                logger.debug(f"Detected provider from first lines: {line}")
                return line, 0.6

        logger.warning("Provider not detected")
        return None, 0.0

    def _extract_amount(self, text: str) -> Tuple[Optional[Decimal], str, float]:
        """
        Extract monetary amount from text

        Args:
            text: Raw text

        Returns:
            Tuple of (amount, currency, confidence)
        """
        # Patterns for amount detection (various formats)
        patterns = [
            # Total: $XX.XX or Total $XX.XX
            r"total[:\s]+\$?\s*([\d,]+\.?\d*)",
            # $XX.XX at end of line
            r"\$\s*([\d,]+\.\d{2})\s*$",
            # XX.XX USD
            r"([\d,]+\.\d{2})\s*(USD|EUR|GBP|JPY)",
            # Amount: XX.XX
            r"amount[:\s]+\$?\s*([\d,]+\.?\d*)",
            # Grand Total: XX.XX
            r"grand\s+total[:\s]+\$?\s*([\d,]+\.?\d*)",
        ]

        currency = "USD"  # Default

        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                try:
                    amount_str = match.group(1).replace(",", "")
                    amount = Decimal(amount_str)

                    # Check for currency in capture group 2
                    if len(match.groups()) > 1 and match.group(2):
                        currency = match.group(2).upper()

                    # Validate amount is reasonable
                    if 0 < amount < 1000000:  # Between 0 and 1M
                        logger.debug(f"Extracted amount: {amount} {currency}")
                        return amount, currency, 0.9

                except (InvalidOperation, ValueError):
                    continue

        logger.warning("Amount not detected")
        return None, currency, 0.0

    def _extract_date(self, text: str) -> Tuple[Optional[date], float]:
        """
        Extract date from text

        Args:
            text: Raw text

        Returns:
            Tuple of (date, confidence)
        """
        # Date patterns (various formats)
        patterns = [
            # DD/MM/YYYY or MM/DD/YYYY
            r"(\d{1,2})[/-](\d{1,2})[/-](\d{4})",
            # YYYY-MM-DD
            r"(\d{4})[/-](\d{1,2})[/-](\d{1,2})",
            # DD-MMM-YYYY (e.g., 22-Oct-2025)
            r"(\d{1,2})-([A-Za-z]{3})-(\d{4})",
            # Month DD, YYYY (e.g., October 22, 2025)
            r"([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})",
        ]

        for pattern in patterns:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                try:
                    # Try to parse date
                    date_str = match.group(0)
                    parsed_date = self._parse_date_string(date_str)

                    if parsed_date:
                        # Validate date is reasonable (not in future, not too old)
                        today = date.today()
                        if parsed_date <= today and (today - parsed_date).days < 365 * 2:  # Within 2 years
                            logger.debug(f"Extracted date: {parsed_date}")
                            return parsed_date, 0.85
                except Exception:
                    continue

        logger.warning("Date not detected")
        return None, 0.0

    def _parse_date_string(self, date_str: str) -> Optional[date]:
        """
        Parse date string with multiple format attempts

        Args:
            date_str: Date string

        Returns:
            Parsed date or None
        """
        formats = [
            "%d/%m/%Y", "%m/%d/%Y",  # DD/MM/YYYY, MM/DD/YYYY
            "%Y-%m-%d", "%Y/%m/%d",  # YYYY-MM-DD
            "%d-%m-%Y", "%m-%d-%Y",  # DD-MM-YYYY
            "%d-%b-%Y",              # DD-MMM-YYYY
            "%B %d, %Y", "%b %d, %Y",  # Month DD, YYYY
        ]

        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt).date()
            except ValueError:
                continue

        return None

    def _classify_category(self, text_lower: str, provider: Optional[str]) -> str:
        """
        Classify expense category based on keywords

        Args:
            text_lower: Lowercase text
            provider: Detected provider name

        Returns:
            Category name
        """
        # Check provider-based classification first
        if provider:
            provider_lower = provider.lower()
            for category, keywords in self.CATEGORY_KEYWORDS.items():
                if any(keyword in provider_lower for keyword in keywords):
                    logger.debug(f"Classified as {category} based on provider")
                    return category

        # Check text-based classification
        category_scores = {}
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            if category == "OTROS":
                continue
            score = sum(1 for keyword in keywords if keyword in text_lower)
            if score > 0:
                category_scores[category] = score

        if category_scores:
            best_category = max(category_scores, key=category_scores.get)
            logger.debug(f"Classified as {best_category} with score {category_scores[best_category]}")
            return best_category

        logger.debug("Classified as OTROS (default)")
        return "OTROS"

    def _extract_receipt_number(self, text: str) -> Optional[str]:
        """
        Extract receipt/invoice number

        Args:
            text: Raw text

        Returns:
            Receipt number or None
        """
        patterns = [
            r"receipt\s*#?\s*:?\s*([A-Z0-9-]+)",
            r"invoice\s*#?\s*:?\s*([A-Z0-9-]+)",
            r"#\s*([A-Z0-9-]{5,})",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                receipt_num = match.group(1)
                logger.debug(f"Extracted receipt number: {receipt_num}")
                return receipt_num

        return None

    def _extract_items(self, text: str) -> List[dict]:
        """
        Extract line items from receipt

        Args:
            text: Raw text

        Returns:
            List of item dictionaries
        """
        items = []

        # Pattern: Description XX.XX or Qty x UnitPrice = Total
        # This is simplified - real implementation would be more sophisticated
        lines = text.split("\n")

        for line in lines:
            # Skip empty lines or lines too short
            if len(line.strip()) < 5:
                continue

            # Try to find amount at end of line
            match = re.search(r"(.+?)\s+([\d,]+\.\d{2})\s*$", line)
            if match:
                description = match.group(1).strip()
                amount_str = match.group(2).replace(",", "")

                try:
                    amount = Decimal(amount_str)
                    if 0 < amount < 10000:  # Reasonable item price
                        items.append({
                            "description": description,
                            "quantity": None,
                            "unit_price": None,
                            "total": float(amount),
                        })
                except (InvalidOperation, ValueError):
                    continue

        logger.debug(f"Extracted {len(items)} items")
        return items[:10]  # Limit to 10 items

    def _extract_tax_and_subtotal(
        self,
        text: str,
        total_amount: Optional[Decimal],
    ) -> Tuple[Optional[Decimal], Optional[Decimal]]:
        """
        Extract tax amount and subtotal

        Args:
            text: Raw text
            total_amount: Total amount (to calculate subtotal if needed)

        Returns:
            Tuple of (tax_amount, subtotal)
        """
        tax_amount = None
        subtotal = None

        # Extract tax
        tax_patterns = [
            r"tax[:\s]+\$?\s*([\d,]+\.?\d*)",
            r"iva[:\s]+\$?\s*([\d,]+\.?\d*)",
            r"impuesto[:\s]+\$?\s*([\d,]+\.?\d*)",
        ]

        for pattern in tax_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    tax_str = match.group(1).replace(",", "")
                    tax_amount = Decimal(tax_str)
                    logger.debug(f"Extracted tax: {tax_amount}")
                    break
                except (InvalidOperation, ValueError):
                    continue

        # Extract subtotal
        subtotal_patterns = [
            r"subtotal[:\s]+\$?\s*([\d,]+\.?\d*)",
            r"sub\s+total[:\s]+\$?\s*([\d,]+\.?\d*)",
        ]

        for pattern in subtotal_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    subtotal_str = match.group(1).replace(",", "")
                    subtotal = Decimal(subtotal_str)
                    logger.debug(f"Extracted subtotal: {subtotal}")
                    break
                except (InvalidOperation, ValueError):
                    continue

        # Calculate subtotal if not found but we have total and tax
        if subtotal is None and total_amount and tax_amount:
            subtotal = total_amount - tax_amount
            logger.debug(f"Calculated subtotal: {subtotal}")

        return tax_amount, subtotal

"""
Two-Factor Authentication Service
Business logic for TOTP, QR codes, and backup codes
"""
import pyotp
import qrcode
import secrets
import hashlib
import base64
from io import BytesIO
from typing import List, Tuple, Optional
from datetime import datetime, timezone
from passlib.context import CryptContext
from cryptography.fernet import Fernet

# Password hashing context for backup codes
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TwoFactorService:
    """Service for handling two-factor authentication"""

    def __init__(self, issuer_name: str = "OnQuota"):
        self.issuer_name = issuer_name

    def generate_secret(self) -> str:
        """
        Generate a new TOTP secret key

        Returns:
            str: Base32 encoded secret key
        """
        return pyotp.random_base32()

    def generate_qr_code(self, email: str, secret: str) -> str:
        """
        Generate QR code for TOTP setup

        Args:
            email: User's email address
            secret: TOTP secret key

        Returns:
            str: Base64 encoded PNG image of QR code
        """
        # Generate provisioning URI
        totp = pyotp.TOTP(secret)
        provisioning_uri = totp.provisioning_uri(
            name=email,
            issuer_name=self.issuer_name
        )

        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(provisioning_uri)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()

        return f"data:image/png;base64,{img_base64}"

    def verify_token(self, secret: str, token: str, valid_window: int = 1) -> bool:
        """
        Verify a TOTP token

        Args:
            secret: TOTP secret key
            token: 6-digit token to verify
            valid_window: Number of time steps to check (default: 1 = ±30 seconds)

        Returns:
            bool: True if token is valid, False otherwise
        """
        if not token or not secret:
            return False

        # Clean token (remove spaces, dashes, etc.)
        token = token.replace(" ", "").replace("-", "")

        # Verify token is 6 digits
        if not token.isdigit() or len(token) != 6:
            return False

        try:
            totp = pyotp.TOTP(secret)
            return totp.verify(token, valid_window=valid_window)
        except Exception:
            return False

    def generate_backup_codes(self, count: int = 10) -> Tuple[List[str], List[str]]:
        """
        Generate backup recovery codes

        Args:
            count: Number of backup codes to generate

        Returns:
            Tuple[List[str], List[str]]: (plain_codes, hashed_codes)
            - plain_codes: Codes to show to user (only shown once)
            - hashed_codes: Hashed codes to store in database
        """
        plain_codes = []
        hashed_codes = []

        for _ in range(count):
            # Generate 8-digit code
            code = ''.join([str(secrets.randbelow(10)) for _ in range(8)])
            plain_codes.append(code)

            # Hash the code for storage
            hashed = pwd_context.hash(code)
            hashed_codes.append(hashed)

        return plain_codes, hashed_codes

    def verify_backup_code(self, code: str, hashed_codes: List[str]) -> Optional[str]:
        """
        Verify a backup code

        Args:
            code: Backup code to verify
            hashed_codes: List of hashed backup codes from database

        Returns:
            Optional[str]: The hashed code that matched (to be removed), or None if no match
        """
        if not code or not hashed_codes:
            return None

        # Clean code
        code = code.replace(" ", "").replace("-", "")

        # Verify code is 8 digits
        if not code.isdigit() or len(code) != 8:
            return None

        # Check against each hashed code
        for hashed_code in hashed_codes:
            if pwd_context.verify(code, hashed_code):
                return hashed_code

        return None

    def is_backup_code(self, token: str) -> bool:
        """
        Check if token looks like a backup code (8 digits) vs TOTP code (6 digits)

        Args:
            token: Token to check

        Returns:
            bool: True if token appears to be a backup code
        """
        clean_token = token.replace(" ", "").replace("-", "")
        return clean_token.isdigit() and len(clean_token) == 8

    def encrypt_secret(self, secret: str, encryption_key: str) -> str:
        """
        Encrypt TOTP secret for storage using Fernet (symmetric encryption)

        Args:
            secret: Plain text secret
            encryption_key: Base64 encoded Fernet encryption key from environment

        Returns:
            str: Encrypted secret (base64 encoded)

        Raises:
            ValueError: If encryption_key is invalid or missing
        """
        if not encryption_key:
            raise ValueError("Encryption key is required for 2FA secret encryption")

        try:
            # Ensure the key is properly encoded
            if isinstance(encryption_key, str):
                encryption_key = encryption_key.encode()

            # Create Fernet cipher
            f = Fernet(encryption_key)

            # Encrypt the secret
            encrypted = f.encrypt(secret.encode())

            # Return as string (base64 encoded by Fernet)
            return encrypted.decode()
        except Exception as e:
            raise ValueError(f"Failed to encrypt 2FA secret: {str(e)}")

    def decrypt_secret(self, encrypted_secret: str, encryption_key: str) -> str:
        """
        Decrypt TOTP secret from storage using Fernet

        Args:
            encrypted_secret: Encrypted secret (base64 encoded)
            encryption_key: Base64 encoded Fernet encryption key from environment

        Returns:
            str: Plain text secret

        Raises:
            ValueError: If decryption fails (invalid key or corrupted data)
        """
        if not encryption_key:
            raise ValueError("Encryption key is required for 2FA secret decryption")

        try:
            # Ensure the key is properly encoded
            if isinstance(encryption_key, str):
                encryption_key = encryption_key.encode()

            # Create Fernet cipher
            f = Fernet(encryption_key)

            # Decrypt the secret
            if isinstance(encrypted_secret, str):
                encrypted_secret = encrypted_secret.encode()

            decrypted = f.decrypt(encrypted_secret)

            # Return as string
            return decrypted.decode()
        except Exception as e:
            raise ValueError(f"Failed to decrypt 2FA secret: {str(e)}")

    def count_remaining_backup_codes(self, backup_codes: Optional[List[str]]) -> int:
        """
        Count remaining unused backup codes

        Args:
            backup_codes: List of hashed backup codes

        Returns:
            int: Number of remaining codes
        """
        return len(backup_codes) if backup_codes else 0


# Singleton instance
two_factor_service = TwoFactorService()


def get_two_factor_service() -> TwoFactorService:
    """Dependency injection for TwoFactorService"""
    return two_factor_service

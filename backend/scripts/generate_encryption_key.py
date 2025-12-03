#!/usr/bin/env python3
"""
Script to generate Fernet encryption key for TOTP secrets

Usage:
    python scripts/generate_encryption_key.py

This will generate a new Fernet encryption key that should be added to your .env file:
    TOTP_ENCRYPTION_KEY=<generated_key>

IMPORTANT:
- Keep this key SECRET and SECURE
- Do NOT commit this key to version control
- Store it in a secure location (password manager, secrets manager, etc.)
- If you lose this key, users with 2FA enabled will need to disable and re-enable 2FA
- Each environment (dev, staging, production) should have its own unique key
"""
from cryptography.fernet import Fernet


def generate_key():
    """Generate a new Fernet encryption key"""
    key = Fernet.generate_key()
    return key.decode()


if __name__ == "__main__":
    key = generate_key()

    print("=" * 80)
    print("TOTP ENCRYPTION KEY GENERATED")
    print("=" * 80)
    print()
    print("Add this line to your .env file:")
    print()
    print(f"TOTP_ENCRYPTION_KEY={key}")
    print()
    print("=" * 80)
    print("IMPORTANT SECURITY NOTES:")
    print("=" * 80)
    print("1. Keep this key SECRET - treat it like a password")
    print("2. Do NOT commit this key to version control")
    print("3. Store it securely (password manager, AWS Secrets Manager, etc.)")
    print("4. If you lose this key, all existing 2FA secrets will be unrecoverable")
    print("5. Each environment should have its own unique key")
    print("6. Rotate this key periodically for security")
    print("=" * 80)

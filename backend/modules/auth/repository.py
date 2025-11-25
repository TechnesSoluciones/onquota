"""
Repository for authentication-related database operations
"""
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.user import User, UserRole
from models.tenant import Tenant
from models.refresh_token import RefreshToken
from core.security import get_password_hash, verify_password
from core.logging import get_logger

logger = get_logger(__name__)


class AuthRepository:
    """Repository for authentication operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ========================================================================
    # Tenant Operations
    # ========================================================================

    async def create_tenant(
        self,
        company_name: str,
        domain: Optional[str] = None,
    ) -> Tenant:
        """
        Create a new tenant

        Args:
            company_name: Company name
            domain: Optional company domain

        Returns:
            Created tenant
        """
        tenant = Tenant(
            company_name=company_name,
            domain=domain,
        )

        self.db.add(tenant)
        await self.db.flush()
        await self.db.refresh(tenant)

        logger.info(f"Created tenant: {tenant.id} - {tenant.company_name}")
        return tenant

    async def get_tenant_by_id(self, tenant_id: UUID) -> Optional[Tenant]:
        """Get tenant by ID"""
        result = await self.db.execute(
            select(Tenant).where(
                and_(
                    Tenant.id == tenant_id,
                    Tenant.is_deleted == False,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_tenant_by_domain(self, domain: str) -> Optional[Tenant]:
        """Get tenant by domain"""
        result = await self.db.execute(
            select(Tenant).where(
                and_(
                    Tenant.domain == domain,
                    Tenant.is_deleted == False,
                )
            )
        )
        return result.scalar_one_or_none()

    # ========================================================================
    # User Operations
    # ========================================================================

    async def create_user(
        self,
        tenant_id: UUID,
        email: str,
        password: str,
        full_name: str,
        phone: Optional[str] = None,
        role: UserRole = UserRole.SALES_REP,
    ) -> User:
        """
        Create a new user

        Args:
            tenant_id: Tenant ID
            email: User email
            password: Plain text password (will be hashed)
            full_name: User full name
            phone: Optional phone number
            role: User role

        Returns:
            Created user
        """
        # Hash password
        hashed_password = get_password_hash(password)

        user = User(
            tenant_id=tenant_id,
            email=email.lower(),
            hashed_password=hashed_password,
            full_name=full_name,
            phone=phone,
            role=role,
        )

        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)

        logger.info(f"Created user: {user.id} - {user.email}")
        return user

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        result = await self.db.execute(
            select(User).where(
                and_(
                    User.email == email.lower(),
                    User.is_deleted == False,
                )
            )
        )
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID"""
        result = await self.db.execute(
            select(User).where(
                and_(
                    User.id == user_id,
                    User.is_deleted == False,
                )
            )
        )
        return result.scalar_one_or_none()

    async def authenticate_user(
        self,
        email: str,
        password: str,
    ) -> Optional[User]:
        """
        Authenticate user by email and password

        Args:
            email: User email
            password: Plain text password

        Returns:
            User if authentication successful, None otherwise
        """
        user = await self.get_user_by_email(email)

        if not user:
            return None

        if not user.is_active:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        # Update last login
        user.last_login = datetime.utcnow()
        await self.db.flush()

        logger.info(f"User authenticated: {user.email}")
        return user

    async def update_user_password(
        self,
        user_id: UUID,
        new_password: str,
    ) -> bool:
        """
        Update user password

        Args:
            user_id: User ID
            new_password: New plain text password

        Returns:
            True if successful
        """
        user = await self.get_user_by_id(user_id)
        if not user:
            return False

        user.hashed_password = get_password_hash(new_password)
        await self.db.flush()

        logger.info(f"Password updated for user: {user.email}")
        return True

    # ========================================================================
    # Refresh Token Operations
    # ========================================================================

    async def create_refresh_token(
        self,
        user_id: UUID,
        tenant_id: UUID,
        token: str,
        expires_at: datetime,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> RefreshToken:
        """
        Create a refresh token

        Args:
            user_id: User ID
            tenant_id: Tenant ID
            token: Refresh token string
            expires_at: Token expiration datetime
            user_agent: Optional user agent string
            ip_address: Optional IP address

        Returns:
            Created refresh token
        """
        refresh_token = RefreshToken(
            user_id=user_id,
            tenant_id=tenant_id,
            token=token,
            expires_at=expires_at,
            user_agent=user_agent,
            ip_address=ip_address,
        )

        self.db.add(refresh_token)
        await self.db.flush()
        await self.db.refresh(refresh_token)

        logger.info(f"Created refresh token for user: {user_id}")
        return refresh_token

    async def get_refresh_token(self, token: str) -> Optional[RefreshToken]:
        """Get refresh token by token string"""
        result = await self.db.execute(
            select(RefreshToken).where(
                and_(
                    RefreshToken.token == token,
                    RefreshToken.is_deleted == False,
                )
            )
        )
        return result.scalar_one_or_none()

    async def revoke_refresh_token(self, token: str) -> bool:
        """
        Revoke a refresh token

        Args:
            token: Token string to revoke

        Returns:
            True if successful
        """
        refresh_token = await self.get_refresh_token(token)
        if not refresh_token:
            return False

        refresh_token.is_revoked = True
        refresh_token.revoked_at = datetime.utcnow()
        await self.db.flush()

        logger.info(f"Revoked refresh token: {refresh_token.id}")
        return True

    async def revoke_all_user_tokens(self, user_id: UUID) -> int:
        """
        Revoke all refresh tokens for a user

        Args:
            user_id: User ID

        Returns:
            Number of tokens revoked
        """
        result = await self.db.execute(
            select(RefreshToken).where(
                and_(
                    RefreshToken.user_id == user_id,
                    RefreshToken.is_revoked == False,
                    RefreshToken.is_deleted == False,
                )
            )
        )
        tokens = result.scalars().all()

        count = 0
        for token in tokens:
            token.is_revoked = True
            token.revoked_at = datetime.utcnow()
            count += 1

        await self.db.flush()

        logger.info(f"Revoked {count} tokens for user: {user_id}")
        return count

    async def cleanup_expired_tokens(self) -> int:
        """
        Clean up expired refresh tokens

        Returns:
            Number of tokens cleaned up
        """
        result = await self.db.execute(
            select(RefreshToken).where(
                and_(
                    RefreshToken.expires_at < datetime.utcnow(),
                    RefreshToken.is_deleted == False,
                )
            )
        )
        tokens = result.scalars().all()

        count = 0
        for token in tokens:
            token.is_deleted = True
            token.deleted_at = datetime.utcnow()
            count += 1

        await self.db.flush()

        logger.info(f"Cleaned up {count} expired tokens")
        return count

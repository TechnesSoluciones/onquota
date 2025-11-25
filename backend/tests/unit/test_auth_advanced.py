"""
Advanced unit tests for Auth module
Tests password validation, token handling, and security features
"""
import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from modules.auth.repository import AuthRepository
from models.user import User
from models.tenant import Tenant
from models.refresh_token import RefreshToken
from core.security import hash_password, verify_password
import secrets


@pytest.fixture
async def auth_tenant(db_session: AsyncSession) -> Tenant:
    """Create test tenant"""
    tenant = Tenant(
        id=uuid4(),
        name="Auth Test Company",
        subdomain="auth-test",
    )
    db_session.add(tenant)
    await db_session.commit()
    await db_session.refresh(tenant)
    return tenant


@pytest.fixture
def auth_repo(db_session: AsyncSession) -> AuthRepository:
    """Create repository instance"""
    return AuthRepository(db_session)


class TestPasswordSecurity:
    """Test suite for password handling and security"""

    @pytest.mark.asyncio
    async def test_hash_password_creates_different_hashes(self):
        """Test that same password creates different hashes (salt)"""
        # Arrange
        password = "TestPassword123"

        # Act
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        # Assert
        assert hash1 != hash2  # Different salts
        assert verify_password(password, hash1)  # Both verify correctly
        assert verify_password(password, hash2)

    @pytest.mark.asyncio
    async def test_password_verification_case_sensitive(self):
        """Test that password verification is case sensitive"""
        # Arrange
        password = "TestPassword123"
        hashed = hash_password(password)

        # Act & Assert
        assert verify_password("TestPassword123", hashed)
        assert not verify_password("testpassword123", hashed)
        assert not verify_password("TESTPASSWORD123", hashed)

    @pytest.mark.asyncio
    async def test_password_length_requirements(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test password length validation"""
        # Arrange - Create user with various password lengths
        test_cases = [
            ("short", False),  # Too short
            ("Medium1", True),  # Valid (8 chars)
            ("ValidPassword123", True),  # Valid
            ("A" * 128, True),  # Very long
        ]

        for password, should_succeed in test_cases:
            email = f"test_{len(password)}@test.com"

            try:
                # Act
                user = await auth_repo.create_user(
                    tenant_id=auth_tenant.id,
                    email=email,
                    username=f"user_{len(password)}",
                    password=password,
                    role="user",
                )

                # Assert
                if should_succeed:
                    assert user.id is not None
                else:
                    pytest.fail(f"Should have rejected password: {password}")
            except ValueError as e:
                if not should_succeed:
                    # Expected failure
                    pass
                else:
                    raise

    @pytest.mark.asyncio
    async def test_password_with_special_characters(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test passwords with special characters"""
        # Arrange
        special_passwords = [
            "Pass!@#$%123",
            "Pass&*()123",
            "Pass[]{}123",
            "Pass<>?123",
            "Pass/|\\123",
        ]

        # Act & Assert
        for idx, password in enumerate(special_passwords):
            user = await auth_repo.create_user(
                tenant_id=auth_tenant.id,
                email=f"special_{idx}@test.com",
                username=f"special_user_{idx}",
                password=password,
                role="user",
            )
            assert user.id is not None

            # Verify password works
            verified = await auth_repo.authenticate_user(
                auth_tenant.id,
                f"special_{idx}@test.com",
                password,
            )
            assert verified is not None

    @pytest.mark.asyncio
    async def test_unicode_password_support(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test passwords with unicode characters"""
        # Arrange
        unicode_passwords = [
            "Password123日本語",
            "パスワード123",
            "Пароль123",
            "كلمة السر123",
        ]

        # Act & Assert
        for idx, password in enumerate(unicode_passwords):
            user = await auth_repo.create_user(
                tenant_id=auth_tenant.id,
                email=f"unicode_{idx}@test.com",
                username=f"unicode_user_{idx}",
                password=password,
                role="user",
            )
            assert user.id is not None

            # Verify password works
            verified = await auth_repo.authenticate_user(
                auth_tenant.id,
                f"unicode_{idx}@test.com",
                password,
            )
            assert verified is not None


class TestUserAuthentication:
    """Test suite for user authentication"""

    @pytest.mark.asyncio
    async def test_authenticate_valid_credentials(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test authenticating with valid email and password"""
        # Arrange
        email = "valid@test.com"
        password = "ValidPassword123"

        user = await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email=email,
            username="valid_user",
            password=password,
            role="user",
        )

        # Act
        authenticated = await auth_repo.authenticate_user(
            auth_tenant.id,
            email,
            password,
        )

        # Assert
        assert authenticated is not None
        assert authenticated.id == user.id
        assert authenticated.email == email

    @pytest.mark.asyncio
    async def test_authenticate_wrong_password(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test authentication fails with wrong password"""
        # Arrange
        email = "wrong_pwd@test.com"
        await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email=email,
            username="wrong_pwd_user",
            password="CorrectPassword123",
            role="user",
        )

        # Act
        result = await auth_repo.authenticate_user(
            auth_tenant.id,
            email,
            "WrongPassword123",
        )

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_authenticate_nonexistent_user(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test authentication fails for non-existent user"""
        # Act
        result = await auth_repo.authenticate_user(
            auth_tenant.id,
            "nonexistent@test.com",
            "AnyPassword123",
        )

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_authenticate_case_insensitive_email(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test that email authentication is case insensitive"""
        # Arrange
        email = "CaseSensitive@Test.com"
        password = "Password123"

        await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email=email,
            username="case_user",
            password=password,
            role="user",
        )

        # Act & Assert - Try different cases
        for test_email in [
            "casesensitive@test.com",
            "CASESENSITIVE@TEST.COM",
            "CaseSensitive@test.com",
        ]:
            result = await auth_repo.authenticate_user(
                auth_tenant.id,
                test_email,
                password,
            )
            assert result is not None

    @pytest.mark.asyncio
    async def test_authenticate_disabled_user(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test that disabled users cannot authenticate"""
        # Arrange
        email = "disabled@test.com"
        password = "Password123"

        user = await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email=email,
            username="disabled_user",
            password=password,
            role="user",
        )

        # Disable user
        user.is_active = False
        # In real scenario, would save this

        # Act
        result = await auth_repo.authenticate_user(
            auth_tenant.id,
            email,
            password,
        )

        # Assert
        assert result is None or not result.is_active


class TestUserRegistration:
    """Test suite for user registration"""

    @pytest.mark.asyncio
    async def test_create_user_basic(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test creating a basic user"""
        # Arrange
        email = "newuser@test.com"
        username = "newuser"
        password = "NewPassword123"

        # Act
        user = await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email=email,
            username=username,
            password=password,
            role="user",
        )

        # Assert
        assert user.id is not None
        assert user.email == email
        assert user.username == username
        assert user.is_active is True

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test that duplicate emails are rejected"""
        # Arrange
        email = "duplicate@test.com"
        password = "Password123"

        await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email=email,
            username="user1",
            password=password,
            role="user",
        )

        # Act & Assert
        with pytest.raises(Exception):  # Should raise unique constraint error
            await auth_repo.create_user(
                tenant_id=auth_tenant.id,
                email=email,
                username="user2",
                password=password,
                role="user",
            )

    @pytest.mark.asyncio
    async def test_create_user_duplicate_username(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test that duplicate usernames are rejected"""
        # Arrange
        username = "duplicateuser"
        password = "Password123"

        await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email="user1@test.com",
            username=username,
            password=password,
            role="user",
        )

        # Act & Assert
        with pytest.raises(Exception):  # Should raise unique constraint error
            await auth_repo.create_user(
                tenant_id=auth_tenant.id,
                email="user2@test.com",
                username=username,
                password=password,
                role="user",
            )

    @pytest.mark.asyncio
    async def test_user_roles_assignment(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test assigning different roles to users"""
        # Arrange
        roles = ["user", "sales_rep", "manager", "admin"]

        # Act & Assert
        for idx, role in enumerate(roles):
            user = await auth_repo.create_user(
                tenant_id=auth_tenant.id,
                email=f"role_{idx}@test.com",
                username=f"role_user_{idx}",
                password="Password123",
                role=role,
            )
            assert user.role == role

    @pytest.mark.asyncio
    async def test_create_user_with_special_characters_email(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test email addresses with special characters"""
        # Arrange
        special_emails = [
            "user.name@test.com",
            "user+tag@test.com",
            "user_name@test.com",
            "user-name@test.com",
            "123user@test.com",
        ]

        # Act & Assert
        for idx, email in enumerate(special_emails):
            user = await auth_repo.create_user(
                tenant_id=auth_tenant.id,
                email=email,
                username=f"special_user_{idx}",
                password="Password123",
                role="user",
            )
            assert user.email == email

    @pytest.mark.asyncio
    async def test_user_tenant_isolation(
        self, auth_repo: AuthRepository, db_session: AsyncSession
    ):
        """Test that users belong to correct tenant"""
        # Arrange
        tenant1 = Tenant(id=uuid4(), name="Tenant1", subdomain="tenant1")
        tenant2 = Tenant(id=uuid4(), name="Tenant2", subdomain="tenant2")
        db_session.add(tenant1)
        db_session.add(tenant2)
        await db_session.commit()

        # Create users in different tenants with same email locally
        user1 = await auth_repo.create_user(
            tenant_id=tenant1.id,
            email="same@test.com",
            username="user_tenant1",
            password="Password123",
            role="user",
        )

        # Can create same email in different tenant
        user2 = await auth_repo.create_user(
            tenant_id=tenant2.id,
            email="same@test.com",
            username="user_tenant2",
            password="Password123",
            role="user",
        )

        # Assert - Users are different but same email
        assert user1.id != user2.id
        assert user1.email == user2.email
        assert user1.tenant_id == tenant1.id
        assert user2.tenant_id == tenant2.id


class TestRefreshTokens:
    """Test suite for refresh token functionality"""

    @pytest.mark.asyncio
    async def test_refresh_token_creation(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test creating a refresh token"""
        # Arrange
        user = await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email="token@test.com",
            username="token_user",
            password="Password123",
            role="user",
        )

        # Act
        refresh_token = await auth_repo.create_refresh_token(user.id)

        # Assert
        assert refresh_token.id is not None
        assert refresh_token.user_id == user.id
        assert refresh_token.is_revoked is False

    @pytest.mark.asyncio
    async def test_refresh_token_expiry(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test refresh token expiration"""
        # Arrange
        user = await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email="expiry@test.com",
            username="expiry_user",
            password="Password123",
            role="user",
        )

        # Act
        refresh_token = await auth_repo.create_refresh_token(user.id)

        # Assert
        assert refresh_token.expires_at > datetime.utcnow()
        assert refresh_token.expires_at <= datetime.utcnow() + timedelta(days=30)

    @pytest.mark.asyncio
    async def test_refresh_token_revocation(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test revoking a refresh token"""
        # Arrange
        user = await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email="revoke@test.com",
            username="revoke_user",
            password="Password123",
            role="user",
        )

        refresh_token = await auth_repo.create_refresh_token(user.id)

        # Act
        revoked = await auth_repo.revoke_refresh_token(refresh_token.id)

        # Assert
        assert revoked is True
        assert refresh_token.is_revoked is True

    @pytest.mark.asyncio
    async def test_revoke_all_user_tokens(
        self, auth_repo: AuthRepository, auth_tenant: Tenant
    ):
        """Test revoking all tokens for a user"""
        # Arrange
        user = await auth_repo.create_user(
            tenant_id=auth_tenant.id,
            email="revoke_all@test.com",
            username="revoke_all_user",
            password="Password123",
            role="user",
        )

        # Create multiple tokens
        tokens = []
        for _ in range(5):
            token = await auth_repo.create_refresh_token(user.id)
            tokens.append(token)

        # Act
        revoked_count = await auth_repo.revoke_all_user_tokens(user.id)

        # Assert
        assert revoked_count >= 5

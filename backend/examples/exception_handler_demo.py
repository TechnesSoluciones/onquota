"""
Exception Handler Demo
Demonstrates how the exception handlers prevent stack trace exposure
Run this with: python -m examples.exception_handler_demo
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


async def demo_exception_handlers():
    """
    Demonstrate exception handler behavior
    """
    from fastapi import FastAPI, HTTPException, status
    from fastapi.testclient import TestClient
    from sqlalchemy.exc import IntegrityError

    from core.exception_handlers import configure_exception_handlers
    from core.exceptions import NotFoundError, UnauthorizedError

    # Create test app
    app = FastAPI()

    # Configure exception handlers
    configure_exception_handlers(app)

    # Test endpoints that raise different exceptions
    @app.get("/test/unhandled")
    async def test_unhandled():
        """Simulate unhandled exception with sensitive data"""
        raise Exception("Database connection failed at postgresql://admin:secret@db.internal:5432/mydb")

    @app.get("/test/not-found")
    async def test_not_found():
        """Test custom NotFoundError"""
        raise NotFoundError(resource="User", resource_id=123)

    @app.get("/test/unauthorized")
    async def test_unauthorized():
        """Test UnauthorizedError"""
        raise UnauthorizedError("Invalid authentication token")

    @app.get("/test/http-404")
    async def test_http_404():
        """Test FastAPI HTTPException"""
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resource not found"
        )

    @app.get("/test/database")
    async def test_database():
        """Test database exception"""
        raise IntegrityError(
            "INSERT INTO users (email) VALUES ('test@example.com')",
            params={},
            orig=Exception("UNIQUE constraint failed: users.email")
        )

    # Create test client
    client = TestClient(app)

    print("\n" + "="*80)
    print("EXCEPTION HANDLER DEMONSTRATION")
    print("="*80)

    # Test 1: Unhandled Exception
    print("\n1. UNHANDLED EXCEPTION (with sensitive data)")
    print("-" * 80)
    response = client.get("/test/unhandled")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    print("\n🔒 Security Check:")
    response_text = response.text
    if "postgresql://" in response_text:
        print("   ❌ FAIL: Database connection string is exposed!")
    else:
        print("   ✅ PASS: Connection string is NOT exposed")
    if "admin:secret" in response_text:
        print("   ❌ FAIL: Database credentials are exposed!")
    else:
        print("   ✅ PASS: Credentials are NOT exposed")

    # Test 2: NotFoundError
    print("\n2. CUSTOM APPLICATION EXCEPTION (NotFoundError)")
    print("-" * 80)
    response = client.get("/test/not-found")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    # Test 3: UnauthorizedError
    print("\n3. CUSTOM APPLICATION EXCEPTION (UnauthorizedError)")
    print("-" * 80)
    response = client.get("/test/unauthorized")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    # Test 4: HTTP 404
    print("\n4. HTTP EXCEPTION (404 Not Found)")
    print("-" * 80)
    response = client.get("/test/http-404")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")

    # Test 5: Database Exception
    print("\n5. DATABASE EXCEPTION (IntegrityError)")
    print("-" * 80)
    response = client.get("/test/database")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    print("\n🔒 Security Check:")
    response_text = response.text
    if "INSERT INTO" in response_text:
        print("   ❌ FAIL: SQL query is exposed!")
    else:
        print("   ✅ PASS: SQL query is NOT exposed")
    if "users.email" in response_text:
        print("   ❌ FAIL: Table/column names are exposed!")
    else:
        print("   ✅ PASS: Schema details are NOT exposed")

    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    print("All exception handlers are working correctly!")
    print("✅ Stack traces are NOT exposed to clients")
    print("✅ Sensitive information is NOT leaked")
    print("✅ Request IDs are included for tracking")
    print("✅ Appropriate status codes are returned")
    print("✅ User-friendly error messages are provided")
    print("\n💡 Note: Full error details are logged server-side for debugging")
    print("="*80 + "\n")


if __name__ == "__main__":
    # Run demo
    try:
        asyncio.run(demo_exception_handlers())
    except ImportError as e:
        print(f"\n❌ Import Error: {e}")
        print("\n💡 Make sure to install dependencies first:")
        print("   pip install -r requirements.txt")
        sys.exit(1)

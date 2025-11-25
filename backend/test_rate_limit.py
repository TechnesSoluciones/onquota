"""
Rate Limiting Test Script
Tests that rate limits are working correctly on authentication endpoints
"""
import asyncio
import httpx
from datetime import datetime


async def test_login_rate_limit():
    """
    Test login endpoint rate limit (5 requests/minute)
    Expected: First 5 requests succeed (or return 401), 6th returns 429
    """
    print("\n" + "="*60)
    print("Testing Login Rate Limit (5/minute)")
    print("="*60)

    base_url = "http://localhost:8000"
    endpoint = f"{base_url}/api/v1/auth/login"

    async with httpx.AsyncClient() as client:
        for i in range(7):
            try:
                response = await client.post(
                    endpoint,
                    json={
                        "email": "test@example.com",
                        "password": "wrongpassword123"
                    },
                    timeout=5.0
                )

                print(f"\nRequest {i+1}:")
                print(f"  Status: {response.status_code}")
                print(f"  X-RateLimit-Limit: {response.headers.get('X-RateLimit-Limit', 'N/A')}")
                print(f"  X-RateLimit-Remaining: {response.headers.get('X-RateLimit-Remaining', 'N/A')}")

                if response.status_code == 429:
                    print(f"  Retry-After: {response.headers.get('Retry-After', 'N/A')} seconds")
                    print(f"  Response: {response.text[:100]}")
                    print("\n✅ Rate limit working! Got 429 as expected")
                    break

                # Small delay to ensure requests are sequential
                await asyncio.sleep(0.1)

            except Exception as e:
                print(f"  Error: {str(e)}")

        else:
            print("\n⚠️  Warning: Did not trigger rate limit after 7 requests")


async def test_register_rate_limit():
    """
    Test registration endpoint rate limit (3 requests/minute)
    Expected: First 3 requests succeed (or return 400), 4th returns 429
    """
    print("\n" + "="*60)
    print("Testing Registration Rate Limit (3/minute)")
    print("="*60)

    base_url = "http://localhost:8000"
    endpoint = f"{base_url}/api/v1/auth/register"

    async with httpx.AsyncClient() as client:
        for i in range(5):
            try:
                timestamp = datetime.now().timestamp()
                response = await client.post(
                    endpoint,
                    json={
                        "email": f"test{timestamp}_{i}@example.com",
                        "password": "Test123!@#",
                        "company_name": f"Test Company {i}",
                        "full_name": "Test User"
                    },
                    timeout=5.0
                )

                print(f"\nRequest {i+1}:")
                print(f"  Status: {response.status_code}")
                print(f"  X-RateLimit-Limit: {response.headers.get('X-RateLimit-Limit', 'N/A')}")
                print(f"  X-RateLimit-Remaining: {response.headers.get('X-RateLimit-Remaining', 'N/A')}")

                if response.status_code == 429:
                    print(f"  Retry-After: {response.headers.get('Retry-After', 'N/A')} seconds")
                    print(f"  Response: {response.text[:100]}")
                    print("\n✅ Rate limit working! Got 429 as expected")
                    break

                # Small delay to ensure requests are sequential
                await asyncio.sleep(0.1)

            except Exception as e:
                print(f"  Error: {str(e)}")

        else:
            print("\n⚠️  Warning: Did not trigger rate limit after 5 requests")


async def test_rate_limit_headers():
    """
    Test that rate limit headers are present in responses
    """
    print("\n" + "="*60)
    print("Testing Rate Limit Headers")
    print("="*60)

    base_url = "http://localhost:8000"
    endpoint = f"{base_url}/api/v1/auth/login"

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                endpoint,
                json={
                    "email": "headers.test@example.com",
                    "password": "testpassword"
                },
                timeout=5.0
            )

            print(f"\nResponse Status: {response.status_code}")
            print("\nRate Limit Headers:")
            print(f"  X-RateLimit-Limit: {response.headers.get('X-RateLimit-Limit', '❌ Missing')}")
            print(f"  X-RateLimit-Remaining: {response.headers.get('X-RateLimit-Remaining', '❌ Missing')}")
            print(f"  X-RateLimit-Reset: {response.headers.get('X-RateLimit-Reset', '❌ Missing')}")

            if all(h in response.headers for h in ['X-RateLimit-Limit', 'X-RateLimit-Remaining']):
                print("\n✅ Rate limit headers present")
            else:
                print("\n⚠️  Warning: Some rate limit headers missing")

        except Exception as e:
            print(f"Error: {str(e)}")


async def main():
    """Run all rate limit tests"""
    print("\n" + "="*60)
    print("RATE LIMITING TEST SUITE")
    print("="*60)
    print("\nPrerequisites:")
    print("  1. Application must be running (uvicorn main:app)")
    print("  2. Redis must be running (redis-server)")
    print("  3. Database must be accessible")
    print("\nStarting tests...\n")

    # Test rate limit headers first
    await test_rate_limit_headers()

    # Wait a bit before testing limits
    print("\nWaiting 2 seconds before limit tests...")
    await asyncio.sleep(2)

    # Test login rate limit
    await test_login_rate_limit()

    # Wait for rate limit window to reset
    print("\nWaiting 65 seconds for rate limit window to reset...")
    await asyncio.sleep(65)

    # Test registration rate limit
    await test_register_rate_limit()

    print("\n" + "="*60)
    print("TEST SUITE COMPLETE")
    print("="*60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
    except Exception as e:
        print(f"\n\nTest failed with error: {str(e)}")
        print("Ensure the application is running and accessible at http://localhost:8000")

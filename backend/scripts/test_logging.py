#!/usr/bin/env python3
"""
Demo script to test structured logging middleware
Run this to see structured JSON logs in action

Usage:
    python scripts/test_logging.py
"""
import asyncio
import httpx
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.logging_config import get_logger, setup_structlog

logger = get_logger(__name__)


async def test_logging():
    """Test logging middleware with various requests"""

    print("\n" + "="*80)
    print("STRUCTURED LOGGING MIDDLEWARE DEMO")
    print("="*80)
    print("\nStarting test server requests...")
    print("Check the console for JSON-formatted logs\n")
    print("="*80 + "\n")

    # Base URL (adjust if your server runs on different port)
    base_url = "http://localhost:8000"

    async with httpx.AsyncClient(base_url=base_url) as client:

        # Test 1: Simple GET request
        print("\n1. Testing simple GET request to /health")
        print("-" * 80)
        try:
            response = await client.get("/health")
            print(f"   Status: {response.status_code}")
            print(f"   Request ID: {response.headers.get('X-Request-ID')}")
        except Exception as e:
            print(f"   Error: {e}")

        await asyncio.sleep(0.5)

        # Test 2: GET request with query parameters
        print("\n2. Testing GET request with query parameters")
        print("-" * 80)
        try:
            response = await client.get("/api/v1/expenses?page=1&limit=10")
            print(f"   Status: {response.status_code}")
            print(f"   Request ID: {response.headers.get('X-Request-ID')}")
        except Exception as e:
            print(f"   Error: {e}")

        await asyncio.sleep(0.5)

        # Test 3: POST request (will fail without auth)
        print("\n3. Testing POST request without authentication")
        print("-" * 80)
        try:
            response = await client.post(
                "/api/v1/expenses/categories",
                json={"name": "Test", "description": "Test"}
            )
            print(f"   Status: {response.status_code}")
            print(f"   Request ID: {response.headers.get('X-Request-ID')}")
        except Exception as e:
            print(f"   Error: {e}")

        await asyncio.sleep(0.5)

        # Test 4: Non-existent endpoint (404)
        print("\n4. Testing non-existent endpoint (404)")
        print("-" * 80)
        try:
            response = await client.get("/api/v1/non-existent")
            print(f"   Status: {response.status_code}")
            print(f"   Request ID: {response.headers.get('X-Request-ID')}")
        except Exception as e:
            print(f"   Error: {e}")

        await asyncio.sleep(0.5)

        # Test 5: Request with custom headers
        print("\n5. Testing request with custom headers")
        print("-" * 80)
        try:
            response = await client.get(
                "/health",
                headers={
                    "User-Agent": "TestClient/1.0",
                    "X-Custom-Header": "test-value"
                }
            )
            print(f"   Status: {response.status_code}")
            print(f"   Request ID: {response.headers.get('X-Request-ID')}")
        except Exception as e:
            print(f"   Error: {e}")

        await asyncio.sleep(0.5)

        # Test 6: Multiple concurrent requests
        print("\n6. Testing multiple concurrent requests")
        print("-" * 80)
        try:
            tasks = [
                client.get("/health"),
                client.get("/health/ready"),
                client.get("/"),
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            for i, response in enumerate(responses, 1):
                if isinstance(response, Exception):
                    print(f"   Request {i} Error: {response}")
                else:
                    print(f"   Request {i} Status: {response.status_code}, "
                          f"Request ID: {response.headers.get('X-Request-ID')}")
        except Exception as e:
            print(f"   Error: {e}")

    print("\n" + "="*80)
    print("TEST COMPLETED")
    print("="*80)
    print("\nCheck the server logs above to see:")
    print("  - JSON-formatted structured logs")
    print("  - request_started and request_completed events")
    print("  - Request IDs, methods, paths, and query parameters")
    print("  - Response status codes and duration in milliseconds")
    print("  - Client IP and user agent information")
    print("="*80 + "\n")


def main():
    """Main entry point"""
    # Setup logging to see our demo logs
    setup_structlog()

    logger.info("Starting logging middleware demo")

    print("\nMake sure the OnQuota API server is running on http://localhost:8000")
    print("Start it with: uvicorn main:app --reload\n")

    try:
        asyncio.run(test_logging())
    except KeyboardInterrupt:
        print("\n\nDemo interrupted by user")
    except Exception as e:
        logger.error("Demo failed", error=str(e), exc_info=True)
        print(f"\nError: {e}")
        print("Make sure the API server is running on http://localhost:8000")
    finally:
        logger.info("Logging middleware demo completed")


if __name__ == "__main__":
    main()

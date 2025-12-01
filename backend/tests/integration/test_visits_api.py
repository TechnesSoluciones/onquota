"""
Integration tests for Visits API
"""
import pytest
from httpx import AsyncClient
from decimal import Decimal
from datetime import datetime, timedelta


@pytest.mark.asyncio
class TestVisitsAPI:
    """Integration tests for Visits endpoints"""

    async def test_create_visit(self, async_client: AsyncClient, auth_headers: dict, test_client_id: str):
        """Test creating a new visit"""
        visit_data = {
            "client_id": test_client_id,
            "title": "Client Meeting",
            "description": "Quarterly business review",
            "scheduled_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
            "duration_minutes": 60,
            "notes": "Prepare presentation",
            "follow_up_required": True
        }

        response = await async_client.post(
            "/api/v1/visits",
            json=visit_data,
            headers=auth_headers
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == visit_data["title"]
        assert data["client_id"] == test_client_id
        assert data["status"] == "SCHEDULED"

    async def test_get_visits_list(self, async_client: AsyncClient, auth_headers: dict):
        """Test retrieving visits list"""
        response = await async_client.get(
            "/api/v1/visits",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data

    async def test_check_in_visit(self, async_client: AsyncClient, auth_headers: dict, test_visit_id: str):
        """Test checking in to a visit"""
        check_in_data = {
            "latitude": Decimal("40.7128"),
            "longitude": Decimal("-74.0060"),
            "address": "New York, NY"
        }

        response = await async_client.post(
            f"/api/v1/visits/{test_visit_id}/check-in",
            json={
                "latitude": str(check_in_data["latitude"]),
                "longitude": str(check_in_data["longitude"]),
                "address": check_in_data["address"]
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "IN_PROGRESS"
        assert data["check_in_time"] is not None
        assert data["check_in_latitude"] is not None

    async def test_check_out_visit(self, async_client: AsyncClient, auth_headers: dict, test_visit_id: str):
        """Test checking out from a visit"""
        # First check in
        await async_client.post(
            f"/api/v1/visits/{test_visit_id}/check-in",
            json={
                "latitude": "40.7128",
                "longitude": "-74.0060"
            },
            headers=auth_headers
        )

        # Then check out
        check_out_data = {
            "latitude": "40.7130",
            "longitude": "-74.0062",
            "notes": "Meeting went well",
            "outcome": "Contract signed"
        }

        response = await async_client.post(
            f"/api/v1/visits/{test_visit_id}/check-out",
            json=check_out_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "COMPLETED"
        assert data["check_out_time"] is not None
        assert data["notes"] == check_out_data["notes"]
        assert data["duration_minutes"] is not None

    async def test_update_visit(self, async_client: AsyncClient, auth_headers: dict, test_visit_id: str):
        """Test updating a visit"""
        update_data = {
            "title": "Updated Meeting Title",
            "notes": "Updated notes"
        }

        response = await async_client.put(
            f"/api/v1/visits/{test_visit_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == update_data["title"]
        assert data["notes"] == update_data["notes"]

    async def test_delete_visit(self, async_client: AsyncClient, auth_headers: dict, test_visit_id: str):
        """Test deleting a visit"""
        response = await async_client.delete(
            f"/api/v1/visits/{test_visit_id}",
            headers=auth_headers
        )

        assert response.status_code == 204

        # Verify visit is deleted
        get_response = await async_client.get(
            f"/api/v1/visits/{test_visit_id}",
            headers=auth_headers
        )
        assert get_response.status_code == 404

    async def test_filter_visits_by_status(self, async_client: AsyncClient, auth_headers: dict):
        """Test filtering visits by status"""
        response = await async_client.get(
            "/api/v1/visits?status=SCHEDULED",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        for visit in data["items"]:
            assert visit["status"] == "SCHEDULED"

    async def test_filter_visits_by_client(self, async_client: AsyncClient, auth_headers: dict, test_client_id: str):
        """Test filtering visits by client"""
        response = await async_client.get(
            f"/api/v1/visits?client_id={test_client_id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        for visit in data["items"]:
            assert visit["client_id"] == test_client_id


# Fixtures needed (add to conftest.py):
"""
@pytest.fixture
async def test_visit_id(async_client: AsyncClient, auth_headers: dict, test_client_id: str):
    '''Create a test visit and return its ID'''
    visit_data = {
        "client_id": test_client_id,
        "title": "Test Visit",
        "scheduled_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
    }

    response = await async_client.post(
        "/api/v1/visits",
        json=visit_data,
        headers=auth_headers
    )

    return response.json()["id"]
"""

"""
Unit tests for Geolocation Service
"""
import pytest
from decimal import Decimal
from modules.visits.services.geolocation import GeolocationService


class TestGeolocationService:
    """Test suite for GeolocationService"""

    def test_calculate_distance_same_point(self):
        """Test distance between same coordinates is 0"""
        service = GeolocationService()
        distance = service.calculate_distance(
            Decimal("40.7128"), Decimal("-74.0060"),
            Decimal("40.7128"), Decimal("-74.0060")
        )
        assert distance == 0.0

    def test_calculate_distance_known_points(self):
        """Test distance calculation with known coordinates"""
        service = GeolocationService()
        # NYC to LA (approx 3944 km)
        distance = service.calculate_distance(
            Decimal("40.7128"), Decimal("-74.0060"),  # NYC
            Decimal("34.0522"), Decimal("-118.2437")   # LA
        )
        # Allow 1% margin of error
        assert 3900 < distance < 4000

    def test_validate_proximity_within_range(self):
        """Test proximity validation when within acceptable range"""
        service = GeolocationService()
        is_valid, distance = service.validate_proximity(
            Decimal("40.7128"), Decimal("-74.0060"),
            Decimal("40.7130"), Decimal("-74.0062"),
            max_distance_km=0.5
        )
        assert is_valid is True
        assert distance < 0.5

    def test_validate_proximity_outside_range(self):
        """Test proximity validation when outside acceptable range"""
        service = GeolocationService()
        is_valid, distance = service.validate_proximity(
            Decimal("40.7128"), Decimal("-74.0060"),  # NYC
            Decimal("34.0522"), Decimal("-118.2437"),  # LA
            max_distance_km=0.5
        )
        assert is_valid is False
        assert distance > 0.5

    def test_validate_proximity_no_client_location(self):
        """Test proximity validation when client has no coordinates"""
        service = GeolocationService()
        is_valid, distance = service.validate_proximity(
            Decimal("40.7128"), Decimal("-74.0060"),
            None, None
        )
        assert is_valid is True
        assert distance == 0.0

    def test_format_coordinates(self):
        """Test coordinate formatting"""
        service = GeolocationService()
        formatted = service.format_coordinates(
            Decimal("40.7128"), Decimal("-74.0060")
        )
        assert "40.7128°N" in formatted
        assert "74.0060°W" in formatted

    def test_get_google_maps_url(self):
        """Test Google Maps URL generation"""
        service = GeolocationService()
        url = service.get_google_maps_url(
            Decimal("40.7128"), Decimal("-74.0060")
        )
        assert url == "https://www.google.com/maps?q=40.7128,-74.0060"


@pytest.mark.asyncio
class TestGeolocationServiceAsync:
    """Test suite for async methods of GeolocationService"""

    async def test_validate_and_geocode_no_proximity(self):
        """Test validation without proximity check"""
        service = GeolocationService()
        result = await service.validate_and_geocode(
            Decimal("40.7128"), Decimal("-74.0060")
        )

        assert "address" in result
        assert "is_valid" in result
        assert "distance_km" in result
        assert result["is_valid"] is True

    async def test_validate_and_geocode_with_valid_proximity(self):
        """Test validation with valid proximity"""
        service = GeolocationService()
        result = await service.validate_and_geocode(
            Decimal("40.7128"), Decimal("-74.0060"),
            client_lat=Decimal("40.7130"),
            client_lon=Decimal("-74.0062"),
            require_proximity=False
        )

        assert result["is_valid"] is True
        assert result["distance_km"] < 0.5

    async def test_validate_and_geocode_with_invalid_proximity_no_requirement(self):
        """Test validation with invalid proximity but no requirement"""
        service = GeolocationService()
        result = await service.validate_and_geocode(
            Decimal("40.7128"), Decimal("-74.0060"),
            client_lat=Decimal("34.0522"),
            client_lon=Decimal("-118.2437"),
            require_proximity=False
        )

        assert result["is_valid"] is False
        assert result["distance_km"] > 0.5

    async def test_validate_and_geocode_with_invalid_proximity_required(self):
        """Test validation with invalid proximity when required"""
        service = GeolocationService()

        with pytest.raises(ValueError) as exc_info:
            await service.validate_and_geocode(
                Decimal("40.7128"), Decimal("-74.0060"),
                client_lat=Decimal("34.0522"),
                client_lon=Decimal("-118.2437"),
                require_proximity=True
            )

        assert "too far from client location" in str(exc_info.value)

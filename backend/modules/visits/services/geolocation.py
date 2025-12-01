"""
Geolocation Service for Visits
Provides GPS validation, reverse geocoding, and proximity verification
"""
import asyncio
from typing import Optional, Tuple, Dict, Any
from decimal import Decimal
from math import radians, cos, sin, asin, sqrt
import httpx

from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


class GeolocationService:
    """
    Service for geolocation operations

    Features:
    - Reverse geocoding using Google Maps API
    - Distance calculation between coordinates
    - Proximity validation for check-in/check-out
    - Address formatting and validation
    """

    # Maximum allowed distance from client location (in kilometers)
    MAX_PROXIMITY_KM = 0.5  # 500 meters

    # Google Maps API endpoints
    GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

    def __init__(self):
        """Initialize geolocation service"""
        self.api_key = getattr(settings, 'GOOGLE_MAPS_API_KEY', '')
        self.timeout = 10.0  # API request timeout in seconds

    def calculate_distance(
        self,
        lat1: Decimal,
        lon1: Decimal,
        lat2: Decimal,
        lon2: Decimal
    ) -> float:
        """
        Calculate distance between two GPS coordinates using Haversine formula

        Args:
            lat1: Latitude of first point
            lon1: Longitude of first point
            lat2: Latitude of second point
            lon2: Longitude of second point

        Returns:
            Distance in kilometers

        Example:
            >>> service = GeolocationService()
            >>> distance = service.calculate_distance(
            ...     Decimal('40.7128'), Decimal('-74.0060'),  # NYC
            ...     Decimal('40.7589'), Decimal('-73.9851')   # Times Square
            ... )
            >>> distance  # ~5.5 km
        """
        # Convert decimal degrees to radians
        lat1_rad, lon1_rad = radians(float(lat1)), radians(float(lon1))
        lat2_rad, lon2_rad = radians(float(lat2)), radians(float(lon2))

        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad

        a = sin(dlat/2)**2 + cos(lat1_rad) * cos(lat2_rad) * sin(dlon/2)**2
        c = 2 * asin(sqrt(a))

        # Radius of earth in kilometers
        r = 6371

        return c * r

    async def reverse_geocode(
        self,
        latitude: Decimal,
        longitude: Decimal,
        language: str = "es"
    ) -> Optional[str]:
        """
        Convert GPS coordinates to human-readable address using Google Maps API

        Args:
            latitude: GPS latitude
            longitude: GPS longitude
            language: Language for address (default: Spanish)

        Returns:
            Formatted address string or None if geocoding fails

        Example:
            >>> service = GeolocationService()
            >>> address = await service.reverse_geocode(
            ...     Decimal('40.7128'), Decimal('-74.0060')
            ... )
            >>> print(address)
            'Nueva York, NY, Estados Unidos'
        """
        if not self.api_key:
            logger.warning("Google Maps API key not configured, skipping reverse geocoding")
            return None

        try:
            params = {
                'latlng': f"{latitude},{longitude}",
                'key': self.api_key,
                'language': language,
                'result_type': 'street_address|route|locality'  # Prioritize useful address types
            }

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.GEOCODE_URL, params=params)
                response.raise_for_status()

                data = response.json()

                if data.get('status') == 'OK' and data.get('results'):
                    # Get the first (most relevant) result
                    address = data['results'][0].get('formatted_address')

                    logger.info(
                        f"Successfully geocoded ({latitude}, {longitude}) to: {address}"
                    )
                    return address
                else:
                    logger.warning(
                        f"Geocoding failed with status: {data.get('status')} "
                        f"for coordinates ({latitude}, {longitude})"
                    )
                    return None

        except httpx.HTTPError as e:
            logger.error(f"HTTP error during reverse geocoding: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during reverse geocoding: {e}")
            return None

    def validate_proximity(
        self,
        check_in_lat: Decimal,
        check_in_lon: Decimal,
        client_lat: Optional[Decimal],
        client_lon: Optional[Decimal],
        max_distance_km: Optional[float] = None
    ) -> Tuple[bool, float]:
        """
        Validate that check-in location is within acceptable proximity to client

        Args:
            check_in_lat: Check-in latitude
            check_in_lon: Check-in longitude
            client_lat: Client's latitude (from client record)
            client_lon: Client's longitude (from client record)
            max_distance_km: Maximum allowed distance (default: 0.5 km)

        Returns:
            Tuple of (is_valid, actual_distance_km)

        Example:
            >>> service = GeolocationService()
            >>> is_valid, distance = service.validate_proximity(
            ...     Decimal('40.7128'), Decimal('-74.0060'),
            ...     Decimal('40.7130'), Decimal('-74.0062'),
            ... )
            >>> is_valid  # True if within 500m
            >>> distance  # ~0.025 km
        """
        # If no client location, validation passes
        if client_lat is None or client_lon is None:
            logger.info("No client location available, proximity validation skipped")
            return True, 0.0

        max_dist = max_distance_km if max_distance_km is not None else self.MAX_PROXIMITY_KM

        # Calculate actual distance
        distance = self.calculate_distance(
            check_in_lat, check_in_lon,
            client_lat, client_lon
        )

        is_valid = distance <= max_dist

        if is_valid:
            logger.info(
                f"Proximity validation PASSED: {distance:.3f} km "
                f"(max: {max_dist} km)"
            )
        else:
            logger.warning(
                f"Proximity validation FAILED: {distance:.3f} km "
                f"(max: {max_dist} km)"
            )

        return is_valid, distance

    async def validate_and_geocode(
        self,
        latitude: Decimal,
        longitude: Decimal,
        client_lat: Optional[Decimal] = None,
        client_lon: Optional[Decimal] = None,
        require_proximity: bool = False
    ) -> Dict[str, Any]:
        """
        Comprehensive validation: geocode address and optionally validate proximity

        Args:
            latitude: Check-in latitude
            longitude: Check-in longitude
            client_lat: Client's latitude (optional)
            client_lon: Client's longitude (optional)
            require_proximity: If True, raises error when proximity validation fails

        Returns:
            Dictionary with:
                - address: Geocoded address string
                - is_valid: Proximity validation result
                - distance_km: Distance from client location

        Raises:
            ValueError: If require_proximity=True and validation fails

        Example:
            >>> service = GeolocationService()
            >>> result = await service.validate_and_geocode(
            ...     Decimal('40.7128'), Decimal('-74.0060'),
            ...     client_lat=Decimal('40.7130'),
            ...     client_lon=Decimal('-74.0062'),
            ...     require_proximity=True
            ... )
            >>> print(result)
            {
                'address': 'Nueva York, NY, Estados Unidos',
                'is_valid': True,
                'distance_km': 0.025
            }
        """
        # Reverse geocode to get address
        address = await self.reverse_geocode(latitude, longitude)

        # Validate proximity if client location provided
        is_valid = True
        distance = 0.0

        if client_lat is not None and client_lon is not None:
            is_valid, distance = self.validate_proximity(
                latitude, longitude,
                client_lat, client_lon
            )

            if require_proximity and not is_valid:
                raise ValueError(
                    f"Check-in location is too far from client location. "
                    f"Distance: {distance:.2f} km (max: {self.MAX_PROXIMITY_KM} km)"
                )

        return {
            'address': address,
            'is_valid': is_valid,
            'distance_km': distance
        }

    def format_coordinates(
        self,
        latitude: Decimal,
        longitude: Decimal
    ) -> str:
        """
        Format GPS coordinates for display

        Args:
            latitude: GPS latitude
            longitude: GPS longitude

        Returns:
            Formatted string like "40.7128°N, 74.0060°W"
        """
        lat_dir = 'N' if latitude >= 0 else 'S'
        lon_dir = 'E' if longitude >= 0 else 'W'

        return f"{abs(float(latitude)):.4f}°{lat_dir}, {abs(float(longitude)):.4f}°{lon_dir}"

    def get_google_maps_url(
        self,
        latitude: Decimal,
        longitude: Decimal
    ) -> str:
        """
        Generate Google Maps URL for given coordinates

        Args:
            latitude: GPS latitude
            longitude: GPS longitude

        Returns:
            Google Maps URL for viewing location

        Example:
            >>> service = GeolocationService()
            >>> url = service.get_google_maps_url(
            ...     Decimal('40.7128'), Decimal('-74.0060')
            ... )
            >>> print(url)
            'https://www.google.com/maps?q=40.7128,-74.0060'
        """
        return f"https://www.google.com/maps?q={latitude},{longitude}"

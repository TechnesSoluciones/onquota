"""
Admin module for user management and system configuration
"""
from modules.admin.repository import AdminRepository
from modules.admin.router import router

__all__ = ["AdminRepository", "router"]

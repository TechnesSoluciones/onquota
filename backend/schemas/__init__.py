"""
Pydantic schemas package

Import schemas directly from their modules to avoid circular dependencies:

    from schemas.auth import UserResponse
    from schemas.expense import ExpenseCreate
    from schemas.quote import QuoteWithItems
    from schemas.client import ClientResponse

DO NOT import from this __init__.py file to prevent eager evaluation
and circular dependency issues.
"""

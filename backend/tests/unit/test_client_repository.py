"""
Unit tests for client repository
"""
import pytest
from datetime import date, timedelta
from uuid import uuid4

from modules.clients.repository import ClientRepository
from modules.auth.repository import AuthRepository
from models.client import ClientStatus, ClientType, Industry


@pytest.mark.asyncio
async def test_create_client(db_session):
    """Test creating client"""
    # Create tenant first
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    # Create client
    repo = ClientRepository(db_session)
    client = await repo.create_client(
        tenant_id=tenant.id,
        name="Acme Corporation",
        client_type=ClientType.COMPANY,
        email="contact@acme.com",
        phone="+1-555-0100",
        industry=Industry.TECHNOLOGY,
        status=ClientStatus.LEAD,
    )

    assert client.id is not None
    assert client.name == "Acme Corporation"
    assert client.client_type == ClientType.COMPANY
    assert client.email == "contact@acme.com"
    assert client.phone == "+1-555-0100"
    assert client.industry == Industry.TECHNOLOGY
    assert client.status == ClientStatus.LEAD
    assert client.is_active is True


@pytest.mark.asyncio
async def test_create_client_with_full_details(db_session):
    """Test creating client with all fields"""
    # Create tenant
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    # Create client with all details
    repo = ClientRepository(db_session)
    client = await repo.create_client(
        tenant_id=tenant.id,
        name="TechCorp Inc",
        client_type=ClientType.COMPANY,
        email="info@techcorp.com",
        phone="+1-555-0200",
        mobile="+1-555-0201",
        website="https://techcorp.com",
        address_line1="123 Tech Street",
        address_line2="Suite 100",
        city="San Francisco",
        state="CA",
        postal_code="94105",
        country="USA",
        industry=Industry.TECHNOLOGY,
        tax_id="12-3456789",
        status=ClientStatus.ACTIVE,
        contact_person_name="John Doe",
        contact_person_email="john@techcorp.com",
        contact_person_phone="+1-555-0202",
        notes="Important client - VIP treatment",
        tags="vip,technology,partner",
        lead_source="Referral",
        first_contact_date=date(2024, 1, 15),
        conversion_date=date(2024, 2, 1),
        linkedin_url="https://linkedin.com/company/techcorp",
        twitter_handle="@techcorp",
        preferred_language="en",
        preferred_currency="USD",
    )

    assert client.name == "TechCorp Inc"
    assert client.website == "https://techcorp.com"
    assert client.city == "San Francisco"
    assert client.state == "CA"
    assert client.country == "USA"
    assert client.contact_person_name == "John Doe"
    assert client.tags == "vip,technology,partner"
    assert client.lead_source == "Referral"
    assert client.first_contact_date == date(2024, 1, 15)
    assert client.conversion_date == date(2024, 2, 1)


@pytest.mark.asyncio
async def test_get_client_by_id(db_session):
    """Test getting client by ID"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)
    created_client = await repo.create_client(
        tenant_id=tenant.id,
        name="Test Client",
        email="test@client.com",
    )

    # Get client
    client = await repo.get_client_by_id(created_client.id, tenant.id)

    assert client is not None
    assert client.id == created_client.id
    assert client.name == "Test Client"
    assert client.email == "test@client.com"


@pytest.mark.asyncio
async def test_get_client_by_email(db_session):
    """Test getting client by email"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)
    await repo.create_client(
        tenant_id=tenant.id,
        name="Test Client",
        email="unique@client.com",
    )

    # Get by email
    client = await repo.get_client_by_email("unique@client.com", tenant.id)

    assert client is not None
    assert client.email == "unique@client.com"
    assert client.name == "Test Client"


@pytest.mark.asyncio
async def test_list_clients(db_session):
    """Test listing clients"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)
    await repo.create_client(tenant_id=tenant.id, name="Client A")
    await repo.create_client(tenant_id=tenant.id, name="Client B")
    await repo.create_client(tenant_id=tenant.id, name="Client C")

    # List all
    clients, total = await repo.list_clients(tenant_id=tenant.id, page=1, page_size=10)

    assert total == 3
    assert len(clients) == 3
    # Should be alphabetically ordered
    assert clients[0].name == "Client A"
    assert clients[1].name == "Client B"
    assert clients[2].name == "Client C"


@pytest.mark.asyncio
async def test_list_clients_with_filters(db_session):
    """Test listing clients with various filters"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)

    # Create clients with different attributes
    await repo.create_client(
        tenant_id=tenant.id,
        name="Tech Lead",
        status=ClientStatus.LEAD,
        industry=Industry.TECHNOLOGY,
        country="USA",
        city="San Francisco",
    )

    await repo.create_client(
        tenant_id=tenant.id,
        name="Healthcare Prospect",
        status=ClientStatus.PROSPECT,
        industry=Industry.HEALTHCARE,
        country="USA",
        city="New York",
    )

    await repo.create_client(
        tenant_id=tenant.id,
        name="Finance Active",
        status=ClientStatus.ACTIVE,
        industry=Industry.FINANCE,
        country="UK",
        city="London",
    )

    # Test: Filter by status
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        status=ClientStatus.LEAD,
        page=1,
        page_size=10,
    )
    assert total == 1
    assert clients[0].name == "Tech Lead"

    # Test: Filter by industry
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        industry=Industry.HEALTHCARE,
        page=1,
        page_size=10,
    )
    assert total == 1
    assert clients[0].name == "Healthcare Prospect"

    # Test: Filter by country
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        country="USA",
        page=1,
        page_size=10,
    )
    assert total == 2

    # Test: Filter by city
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        city="London",
        page=1,
        page_size=10,
    )
    assert total == 1
    assert clients[0].name == "Finance Active"


@pytest.mark.asyncio
async def test_list_clients_with_search(db_session):
    """Test listing clients with search"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)
    await repo.create_client(
        tenant_id=tenant.id,
        name="Acme Corporation",
        email="contact@acme.com",
        notes="Great client for enterprise solutions",
    )
    await repo.create_client(
        tenant_id=tenant.id,
        name="Beta Industries",
        email="info@beta.com",
        contact_person_name="Alice Johnson",
    )
    await repo.create_client(
        tenant_id=tenant.id,
        name="Gamma LLC",
        email="hello@gamma.com",
    )

    # Test: Search in name
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        search="Acme",
        page=1,
        page_size=10,
    )
    assert total == 1
    assert clients[0].name == "Acme Corporation"

    # Test: Search in email
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        search="beta.com",
        page=1,
        page_size=10,
    )
    assert total == 1
    assert clients[0].name == "Beta Industries"

    # Test: Search in contact person
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        search="Alice",
        page=1,
        page_size=10,
    )
    assert total == 1
    assert clients[0].name == "Beta Industries"

    # Test: Search in notes
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        search="enterprise",
        page=1,
        page_size=10,
    )
    assert total == 1
    assert clients[0].name == "Acme Corporation"


@pytest.mark.asyncio
async def test_list_clients_pagination(db_session):
    """Test client list pagination"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)

    # Create 25 clients
    for i in range(25):
        await repo.create_client(
            tenant_id=tenant.id,
            name=f"Client {i + 1:02d}",
        )

    # Test: First page (10 items)
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        page=1,
        page_size=10,
    )
    assert total == 25
    assert len(clients) == 10
    assert clients[0].name == "Client 01"

    # Test: Second page (10 items)
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        page=2,
        page_size=10,
    )
    assert total == 25
    assert len(clients) == 10

    # Test: Third page (5 items)
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        page=3,
        page_size=10,
    )
    assert total == 25
    assert len(clients) == 5


@pytest.mark.asyncio
async def test_update_client(db_session):
    """Test updating client"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)
    client = await repo.create_client(
        tenant_id=tenant.id,
        name="Original Name",
        email="original@email.com",
        status=ClientStatus.LEAD,
    )

    # Update client
    updated_client = await repo.update_client(
        client_id=client.id,
        tenant_id=tenant.id,
        name="Updated Name",
        email="updated@email.com",
        phone="+1-555-9999",
    )

    assert updated_client is not None
    assert updated_client.name == "Updated Name"
    assert updated_client.email == "updated@email.com"
    assert updated_client.phone == "+1-555-9999"
    assert updated_client.status == ClientStatus.LEAD  # Unchanged


@pytest.mark.asyncio
async def test_update_client_status(db_session):
    """Test updating client status"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)
    client = await repo.create_client(
        tenant_id=tenant.id,
        name="Test Client",
        status=ClientStatus.LEAD,
    )

    # Update to prospect
    updated_client = await repo.update_client_status(
        client_id=client.id,
        tenant_id=tenant.id,
        status=ClientStatus.PROSPECT,
    )

    assert updated_client.status == ClientStatus.PROSPECT

    # Update to active
    updated_client = await repo.update_client_status(
        client_id=client.id,
        tenant_id=tenant.id,
        status=ClientStatus.ACTIVE,
    )

    assert updated_client.status == ClientStatus.ACTIVE


@pytest.mark.asyncio
async def test_delete_client(db_session):
    """Test soft deleting client"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)
    client = await repo.create_client(
        tenant_id=tenant.id,
        name="Client to Delete",
    )

    # Delete client
    success = await repo.delete_client(client.id, tenant.id)
    assert success is True

    # Try to get deleted client (should return None)
    deleted_client = await repo.get_client_by_id(client.id, tenant.id)
    assert deleted_client is None


@pytest.mark.asyncio
async def test_get_client_summary(db_session):
    """Test getting client summary"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)

    # Create clients with different statuses
    await repo.create_client(tenant_id=tenant.id, name="Lead 1", status=ClientStatus.LEAD)
    await repo.create_client(tenant_id=tenant.id, name="Lead 2", status=ClientStatus.LEAD)
    await repo.create_client(tenant_id=tenant.id, name="Prospect 1", status=ClientStatus.PROSPECT)
    await repo.create_client(tenant_id=tenant.id, name="Active 1", status=ClientStatus.ACTIVE)
    await repo.create_client(tenant_id=tenant.id, name="Active 2", status=ClientStatus.ACTIVE)
    await repo.create_client(tenant_id=tenant.id, name="Active 3", status=ClientStatus.ACTIVE)
    await repo.create_client(tenant_id=tenant.id, name="Inactive 1", status=ClientStatus.INACTIVE)
    await repo.create_client(tenant_id=tenant.id, name="Lost 1", status=ClientStatus.LOST)

    # Get summary
    summary = await repo.get_client_summary(tenant_id=tenant.id)

    assert summary["total_clients"] == 8
    assert summary["leads_count"] == 2
    assert summary["prospects_count"] == 1
    assert summary["active_count"] == 3
    assert summary["inactive_count"] == 1
    assert summary["lost_count"] == 1


@pytest.mark.asyncio
async def test_get_clients_by_industry(db_session):
    """Test getting client count by industry"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)

    # Create clients in different industries
    await repo.create_client(tenant_id=tenant.id, name="Tech 1", industry=Industry.TECHNOLOGY)
    await repo.create_client(tenant_id=tenant.id, name="Tech 2", industry=Industry.TECHNOLOGY)
    await repo.create_client(tenant_id=tenant.id, name="Tech 3", industry=Industry.TECHNOLOGY)
    await repo.create_client(tenant_id=tenant.id, name="Health 1", industry=Industry.HEALTHCARE)
    await repo.create_client(tenant_id=tenant.id, name="Finance 1", industry=Industry.FINANCE)

    # Get by industry
    by_industry = await repo.get_clients_by_industry(tenant_id=tenant.id)

    assert len(by_industry) == 3
    # Should be ordered by count desc
    assert by_industry[0]["industry"] == Industry.TECHNOLOGY
    assert by_industry[0]["count"] == 3
    assert by_industry[1]["industry"] == Industry.HEALTHCARE
    assert by_industry[1]["count"] == 1
    assert by_industry[2]["industry"] == Industry.FINANCE
    assert by_industry[2]["count"] == 1


@pytest.mark.asyncio
async def test_filter_by_tags(db_session):
    """Test filtering clients by tags"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)
    await repo.create_client(tenant_id=tenant.id, name="VIP Client", tags="vip,priority")
    await repo.create_client(tenant_id=tenant.id, name="Partner", tags="partner,technology")
    await repo.create_client(tenant_id=tenant.id, name="Regular", tags="standard")

    # Filter by tag
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        tags="vip",
        page=1,
        page_size=10,
    )

    assert total == 1
    assert clients[0].name == "VIP Client"


@pytest.mark.asyncio
async def test_filter_by_lead_source(db_session):
    """Test filtering clients by lead source"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)
    await repo.create_client(tenant_id=tenant.id, name="Web Lead", lead_source="Website")
    await repo.create_client(tenant_id=tenant.id, name="Referral Lead", lead_source="Referral")
    await repo.create_client(tenant_id=tenant.id, name="Cold Call", lead_source="Cold Call")

    # Filter by lead source
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        lead_source="Referral",
        page=1,
        page_size=10,
    )

    assert total == 1
    assert clients[0].name == "Referral Lead"


@pytest.mark.asyncio
async def test_filter_by_client_type(db_session):
    """Test filtering clients by client type"""
    # Setup
    auth_repo = AuthRepository(db_session)
    tenant = await auth_repo.create_tenant(company_name="Test Company")

    repo = ClientRepository(db_session)
    await repo.create_client(
        tenant_id=tenant.id,
        name="John Doe",
        client_type=ClientType.INDIVIDUAL,
    )
    await repo.create_client(
        tenant_id=tenant.id,
        name="Acme Corp",
        client_type=ClientType.COMPANY,
    )
    await repo.create_client(
        tenant_id=tenant.id,
        name="Beta Inc",
        client_type=ClientType.COMPANY,
    )

    # Filter by individual
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        client_type=ClientType.INDIVIDUAL,
        page=1,
        page_size=10,
    )
    assert total == 1
    assert clients[0].name == "John Doe"

    # Filter by company
    clients, total = await repo.list_clients(
        tenant_id=tenant.id,
        client_type=ClientType.COMPANY,
        page=1,
        page_size=10,
    )
    assert total == 2

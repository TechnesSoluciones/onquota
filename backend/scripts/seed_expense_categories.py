"""
Script to seed expense categories for existing tenants
"""
import asyncio
from uuid import uuid4

from core.database import AsyncSessionLocal
from models.expense_category import ExpenseCategory
from models.tenant import Tenant
from sqlalchemy import select


async def seed_expense_categories():
    """Seed expense categories for all active tenants"""
    print("🌱 Seeding expense categories...")

    async with AsyncSessionLocal() as session:
        try:
            # Get all active tenants
            result = await session.execute(
                select(Tenant).where(Tenant.is_active == True)
            )
            tenants = result.scalars().all()

            if not tenants:
                print("❌ No active tenants found")
                return

            # Define generic expense categories with icons and colors
            categories_data = [
                {
                    "name": "Transporte",
                    "description": "Gastos de transporte, combustible, taxis, etc.",
                    "icon": "car",
                    "color": "#3b82f6",  # Blue
                },
                {
                    "name": "Alimentación",
                    "description": "Comidas, almuerzos de negocios, catering",
                    "icon": "utensils",
                    "color": "#f59e0b",  # Amber
                },
                {
                    "name": "Alojamiento",
                    "description": "Hoteles, hospedaje, viajes de negocios",
                    "icon": "hotel",
                    "color": "#8b5cf6",  # Purple
                },
                {
                    "name": "Suministros de Oficina",
                    "description": "Papelería, material de oficina, consumibles",
                    "icon": "pencil",
                    "color": "#10b981",  # Green
                },
                {
                    "name": "Tecnología",
                    "description": "Software, hardware, servicios tecnológicos",
                    "icon": "laptop",
                    "color": "#06b6d4",  # Cyan
                },
                {
                    "name": "Comunicaciones",
                    "description": "Teléfono, internet, servicios de mensajería",
                    "icon": "phone",
                    "color": "#6366f1",  # Indigo
                },
                {
                    "name": "Marketing y Publicidad",
                    "description": "Campañas publicitarias, marketing digital, material promocional",
                    "icon": "megaphone",
                    "color": "#ec4899",  # Pink
                },
                {
                    "name": "Mantenimiento",
                    "description": "Reparaciones, mantenimiento de equipos e instalaciones",
                    "icon": "wrench",
                    "color": "#ef4444",  # Red
                },
                {
                    "name": "Capacitación",
                    "description": "Cursos, seminarios, formación profesional",
                    "icon": "graduation-cap",
                    "color": "#14b8a6",  # Teal
                },
                {
                    "name": "Servicios Profesionales",
                    "description": "Consultoría, asesoría legal, servicios contables",
                    "icon": "briefcase",
                    "color": "#64748b",  # Slate
                },
                {
                    "name": "Seguros",
                    "description": "Seguros de vehículos, salud, responsabilidad civil",
                    "icon": "shield",
                    "color": "#0ea5e9",  # Sky
                },
                {
                    "name": "Otros",
                    "description": "Gastos varios no categorizados",
                    "icon": "ellipsis",
                    "color": "#71717a",  # Gray
                },
            ]

            total_created = 0

            for tenant in tenants:
                print(f"\n📦 Processing tenant: {tenant.company_name}")

                # Check if categories already exist
                result = await session.execute(
                    select(ExpenseCategory).where(
                        ExpenseCategory.tenant_id == tenant.id
                    )
                )
                existing_categories = result.scalars().all()

                if existing_categories:
                    print(
                        f"   ⚠️  Tenant already has {len(existing_categories)} categories, skipping..."
                    )
                    continue

                # Create categories for this tenant
                for cat_data in categories_data:
                    category = ExpenseCategory(
                        id=uuid4(),
                        tenant_id=tenant.id,
                        name=cat_data["name"],
                        description=cat_data["description"],
                        icon=cat_data["icon"],
                        color=cat_data["color"],
                        is_active=True,
                    )
                    session.add(category)
                    total_created += 1

                print(f"   ✓ Created {len(categories_data)} categories")

            # Commit all changes
            await session.commit()
            print(f"\n✅ Successfully created {total_created} expense categories!")

        except Exception as e:
            print(f"\n❌ Error seeding categories: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed_expense_categories())

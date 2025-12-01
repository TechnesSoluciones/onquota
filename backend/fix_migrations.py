#!/usr/bin/env python3
"""
Fix ENUM duplicate issue in Alembic migrations.

The problem: When manually creating ENUM types with .create() and then using them
in op.create_table() with create_type=True, SQL Alchemy tries to create the ENUM twice.

The solution: After creating the ENUM manually, create a second ENUM object with
create_type=False for use in the table definition.
"""

import re

def fix_migration_file(filepath):
    """Fix a single migration file"""
    with open(filepath, 'r') as f:
        content = f.read()

    # Pattern: Find ENUM definitions that are created manually
    # and then used in table definitions

    # For migration 013 - visits and calls
    if '013_create_visits_calls_tables.py' in filepath:
        # Fix visit_status_enum
        content = content.replace(
            """    visit_status_enum = postgresql.ENUM(
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        name='visit_status',
        create_type=True
    )
    visit_status_enum.create(op.get_bind(), checkfirst=True)""",
            """    # Create visit_status enum type in database
    postgresql.ENUM(
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        name='visit_status',
        create_type=True
    ).create(op.get_bind(), checkfirst=True)

    # Create ENUM object for table definition (create_type=False to avoid duplicate)
    visit_status_enum = postgresql.ENUM(
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        name='visit_status',
        create_type=False
    )"""
        )

        # Fix call_type_enum
        content = content.replace(
            """    call_type_enum = postgresql.ENUM(
        'incoming',
        'outgoing',
        'missed',
        name='call_type',
        create_type=True
    )
    call_type_enum.create(op.get_bind(), checkfirst=True)""",
            """    # Create call_type enum type in database
    postgresql.ENUM(
        'incoming',
        'outgoing',
        'missed',
        name='call_type',
        create_type=True
    ).create(op.get_bind(), checkfirst=True)

    # Create ENUM object for table definition (create_type=False to avoid duplicate)
    call_type_enum = postgresql.ENUM(
        'incoming',
        'outgoing',
        'missed',
        name='call_type',
        create_type=False
    )"""
        )

        # Fix call_status_enum
        content = content.replace(
            """    call_status_enum = postgresql.ENUM(
        'scheduled',
        'completed',
        'no_answer',
        'voicemail',
        'cancelled',
        name='call_status',
        create_type=True
    )
    call_status_enum.create(op.get_bind(), checkfirst=True)""",
            """    # Create call_status enum type in database
    postgresql.ENUM(
        'scheduled',
        'completed',
        'no_answer',
        'voicemail',
        'cancelled',
        name='call_status',
        create_type=True
    ).create(op.get_bind(), checkfirst=True)

    # Create ENUM object for table definition (create_type=False to avoid duplicate)
    call_status_enum = postgresql.ENUM(
        'scheduled',
        'completed',
        'no_answer',
        'voicemail',
        'cancelled',
        name='call_status',
        create_type=False
    )"""
        )

    # Save fixed content
    with open(filepath, 'w') as f:
        f.write(content)

    print(f"Fixed {filepath}")

# Fix the migrations
fix_migration_file('/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/alembic/versions/013_create_visits_calls_tables.py')

print("Migration files fixed successfully!")

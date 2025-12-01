"""
Celery Tasks for Account Plans
Background tasks for milestone reminders and plan health checks
"""
from typing import List
from datetime import date, datetime, timedelta
from sqlalchemy import select, and_
from sqlalchemy.orm import joinedload

from core.celery import celery_app
from core.database import SessionLocal
from core.logging import get_logger
from models.account_plan import AccountPlan, Milestone, MilestoneStatus, PlanStatus
from models.notification import Notification, NotificationType, NotificationCategory
from modules.notifications.repository import NotificationRepository

logger = get_logger(__name__)


@celery_app.task(name="accounts.check_upcoming_milestones")
def check_upcoming_milestones():
    """
    Check for milestones due in the next 7 days and send reminders
    Runs daily at 9:00 AM
    """
    logger.info("🔔 Starting check for upcoming milestones")

    try:
        db = SessionLocal()

        today = date.today()
        reminder_window = today + timedelta(days=7)

        # Query milestones due in next 7 days
        stmt = select(Milestone).where(
            and_(
                Milestone.status.in_([MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS]),
                Milestone.due_date.between(today, reminder_window)
            )
        ).options(joinedload(Milestone.plan))

        result = db.execute(stmt)
        upcoming_milestones = result.scalars().all()

        notification_repo = NotificationRepository(db)
        notifications_created = 0

        for milestone in upcoming_milestones:
            plan = milestone.plan
            days_until_due = (milestone.due_date - today).days

            # Create notification for assigned user
            title = f"Milestone Due: {milestone.title}"
            message = (
                f"The milestone '{milestone.title}' for account plan '{plan.title}' "
                f"is due in {days_until_due} days ({milestone.due_date})."
            )

            notification_repo.create(
                user_id=plan.assigned_to,
                type=NotificationType.INFO if days_until_due > 2 else NotificationType.WARNING,
                category=NotificationCategory.SYSTEM,
                title=title,
                message=message
            )

            notifications_created += 1

        db.commit()
        logger.info(f"✅ Created {notifications_created} milestone reminders")

    except Exception as e:
        logger.error(f"❌ Error checking upcoming milestones: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="accounts.check_overdue_milestones")
def check_overdue_milestones():
    """
    Check for overdue milestones and send alerts
    Runs daily at 9:30 AM
    """
    logger.info("⚠️ Starting check for overdue milestones")

    try:
        db = SessionLocal()

        today = date.today()

        # Query overdue milestones
        stmt = select(Milestone).where(
            and_(
                Milestone.status.in_([MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS]),
                Milestone.due_date < today
            )
        ).options(joinedload(Milestone.plan))

        result = db.execute(stmt)
        overdue_milestones = result.scalars().all()

        notification_repo = NotificationRepository(db)
        notifications_created = 0

        for milestone in overdue_milestones:
            plan = milestone.plan
            days_overdue = (today - milestone.due_date).days

            title = f"Overdue Milestone: {milestone.title}"
            message = (
                f"The milestone '{milestone.title}' for account plan '{plan.title}' "
                f"is {days_overdue} days overdue (was due on {milestone.due_date})."
            )

            notification_repo.create(
                user_id=plan.assigned_to,
                type=NotificationType.ERROR,
                category=NotificationCategory.SYSTEM,
                title=title,
                message=message
            )

            notifications_created += 1

        db.commit()
        logger.info(f"✅ Created {notifications_created} overdue milestone alerts")

    except Exception as e:
        logger.error(f"❌ Error checking overdue milestones: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="accounts.check_at_risk_plans")
def check_at_risk_plans():
    """
    Check for account plans that are at risk (low progress, many overdue milestones)
    Runs weekly on Monday at 8:00 AM
    """
    logger.info("🚨 Starting check for at-risk account plans")

    try:
        db = SessionLocal()

        today = date.today()

        # Query active plans with milestones
        stmt = select(AccountPlan).where(
            AccountPlan.status == PlanStatus.ACTIVE
        ).options(joinedload(AccountPlan.milestones))

        result = db.execute(stmt)
        active_plans = result.scalars().all()

        notification_repo = NotificationRepository(db)
        alerts_created = 0

        for plan in active_plans:
            # Calculate risk factors
            total_milestones = len(plan.milestones)
            if total_milestones == 0:
                continue

            overdue_milestones = [
                m for m in plan.milestones
                if m.status in [MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS]
                and m.due_date < today
            ]
            overdue_count = len(overdue_milestones)
            overdue_percentage = (overdue_count / total_milestones) * 100

            # Check if plan is at risk
            is_at_risk = (
                overdue_percentage > 30 or  # More than 30% overdue
                (plan.progress < 25 and plan.days_since_created > 30)  # Low progress after 30 days
            )

            if is_at_risk:
                title = f"At-Risk Account Plan: {plan.title}"
                message = (
                    f"Account plan '{plan.title}' requires attention:\n"
                    f"- Progress: {plan.progress}%\n"
                    f"- Overdue milestones: {overdue_count}/{total_milestones}\n"
                    f"- Days active: {plan.days_since_created}"
                )

                notification_repo.create(
                    user_id=plan.assigned_to,
                    type=NotificationType.WARNING,
                    category=NotificationCategory.SYSTEM,
                    title=title,
                    message=message
                )

                alerts_created += 1

        db.commit()
        logger.info(f"✅ Created {alerts_created} at-risk plan alerts")

    except Exception as e:
        logger.error(f"❌ Error checking at-risk plans: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="accounts.generate_weekly_digest")
def generate_weekly_digest():
    """
    Generate weekly digest of account plan activities
    Runs weekly on Monday at 7:00 AM
    """
    logger.info("📊 Generating weekly account plan digest")

    try:
        db = SessionLocal()

        # Query all active plans
        stmt = select(AccountPlan).where(
            AccountPlan.status == PlanStatus.ACTIVE
        ).options(joinedload(AccountPlan.milestones))

        result = db.execute(stmt)
        active_plans = result.scalars().all()

        notification_repo = NotificationRepository(db)
        digests_created = 0

        # Group plans by assigned user
        plans_by_user = {}
        for plan in active_plans:
            if plan.assigned_to not in plans_by_user:
                plans_by_user[plan.assigned_to] = []
            plans_by_user[plan.assigned_to].append(plan)

        # Create digest for each user
        for user_id, user_plans in plans_by_user.items():
            total_plans = len(user_plans)
            avg_progress = sum(p.progress for p in user_plans) / total_plans

            title = "Weekly Account Plans Digest"
            message = (
                f"Summary of your {total_plans} active account plans:\n"
                f"- Average progress: {avg_progress:.1f}%\n"
                f"- Plans needing attention: {sum(1 for p in user_plans if p.progress < 50)}"
            )

            notification_repo.create(
                user_id=user_id,
                type=NotificationType.INFO,
                category=NotificationCategory.SYSTEM,
                title=title,
                message=message
            )

            digests_created += 1

        db.commit()
        logger.info(f"✅ Generated {digests_created} weekly digests")

    except Exception as e:
        logger.error(f"❌ Error generating weekly digest: {e}")
        db.rollback()
        raise
    finally:
        db.close()

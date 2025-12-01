"""
Celery tasks for notifications
Scheduled tasks for checking expired quotes, pending maintenance, and sending summaries
"""
import logging
from datetime import datetime, timedelta, date
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from core.celery import celery_app
from core.database import SessionLocal
from models.user import User
from models.quote import Quote, SaleStatus
from models.transport import Vehicle
from models.opportunity import Opportunity, OpportunityStage
from models.notification import Notification, NotificationType, NotificationCategory
from modules.notifications.repository import NotificationRepository
from modules.notifications.services.email import email_service

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="notifications.check_expired_quotes")
def check_expired_quotes(self):
    """
    Daily task to check for expired quotes and create notifications

    Schedule: Every day at 9:00 AM

    Logic:
    - Find quotes with status SENT that have expired (valid_until < today)
    - Create notification for assigned sales rep
    - Send email if user has email notifications enabled

    Returns:
        Number of notifications created
    """
    logger.info("Starting check_expired_quotes task")

    db = SessionLocal()
    notification_count = 0

    try:
        # Find expired quotes
        today = date.today()

        stmt = (
            select(Quote)
            .where(
                and_(
                    Quote.status == SaleStatus.SENT,
                    Quote.valid_until < today,
                    Quote.is_deleted == False
                )
            )
        )

        result = db.execute(stmt)
        expired_quotes = result.scalars().all()

        logger.info(f"Found {len(expired_quotes)} expired quotes")

        for quote in expired_quotes:
            # Get the user who created the quote
            user_stmt = select(User).where(User.id == quote.created_by)
            user_result = db.execute(user_stmt)
            user = user_result.scalar_one_or_none()

            if not user:
                logger.warning(f"User not found for quote {quote.id}")
                continue

            # Create notification
            notification = Notification(
                tenant_id=quote.tenant_id,
                user_id=user.id,
                title="Quote Expired",
                message=f"Quote {quote.quote_number} for client {quote.client.name} has expired on {quote.valid_until}. Please review and update or close the quote.",
                type=NotificationType.WARNING,
                category=NotificationCategory.QUOTE,
                action_url=f"/quotes/{quote.id}",
                action_label="Review Quote",
                related_entity_type="quote",
                related_entity_id=quote.id,
            )

            db.add(notification)
            db.flush()
            notification_count += 1

            # Send email notification (async)
            try:
                success, error = email_service.send_notification_email(
                    to_email=user.email,
                    to_name=user.full_name,
                    title="Quote Expired",
                    message=f"Quote {quote.quote_number} has expired on {quote.valid_until}.",
                    action_url=f"{get_app_url()}/quotes/{quote.id}",
                    action_label="Review Quote",
                )

                # Update notification email status
                notification.email_sent = success
                if success:
                    notification.email_sent_at = datetime.utcnow()
                else:
                    notification.email_error = error

            except Exception as e:
                logger.error(f"Error sending email for expired quote {quote.id}: {e}")

        db.commit()
        logger.info(f"Created {notification_count} notifications for expired quotes")

    except Exception as e:
        logger.error(f"Error in check_expired_quotes task: {e}")
        db.rollback()
        raise
    finally:
        db.close()

    return notification_count


@celery_app.task(bind=True, name="notifications.check_pending_maintenance")
def check_pending_maintenance(self):
    """
    Daily task to check for pending vehicle maintenance and create notifications

    Schedule: Every day at 8:00 AM

    Logic:
    - Find vehicles with upcoming maintenance (within next 7 days)
    - Find vehicles with overdue maintenance
    - Create notifications for responsible users
    - Send email alerts

    Returns:
        Number of notifications created
    """
    logger.info("Starting check_pending_maintenance task")

    db = SessionLocal()
    notification_count = 0

    try:
        today = date.today()
        upcoming_threshold = today + timedelta(days=7)

        # Find vehicles with upcoming or overdue maintenance
        stmt = (
            select(Vehicle)
            .where(
                and_(
                    Vehicle.next_maintenance_date.isnot(None),
                    Vehicle.next_maintenance_date <= upcoming_threshold,
                    Vehicle.is_deleted == False
                )
            )
        )

        result = db.execute(stmt)
        vehicles = result.scalars().all()

        logger.info(f"Found {len(vehicles)} vehicles with pending maintenance")

        # Group by tenant to send to admins/supervisors
        vehicles_by_tenant = {}
        for vehicle in vehicles:
            if vehicle.tenant_id not in vehicles_by_tenant:
                vehicles_by_tenant[vehicle.tenant_id] = []
            vehicles_by_tenant[vehicle.tenant_id].append(vehicle)

        # Create notifications for each tenant's admins/supervisors
        for tenant_id, tenant_vehicles in vehicles_by_tenant.items():
            # Find admin and supervisor users for this tenant
            user_stmt = (
                select(User)
                .where(
                    and_(
                        User.tenant_id == tenant_id,
                        User.role.in_(["admin", "supervisor"]),
                        User.is_active == True,
                        User.is_deleted == False
                    )
                )
            )

            user_result = db.execute(user_stmt)
            users = user_result.scalars().all()

            # Build message with vehicle list
            overdue_vehicles = [v for v in tenant_vehicles if v.next_maintenance_date < today]
            upcoming_vehicles = [v for v in tenant_vehicles if v.next_maintenance_date >= today]

            message_parts = []
            if overdue_vehicles:
                message_parts.append(f"{len(overdue_vehicles)} vehicles have overdue maintenance:")
                for v in overdue_vehicles[:5]:  # Show max 5
                    message_parts.append(f"- {v.license_plate} (Due: {v.next_maintenance_date})")

            if upcoming_vehicles:
                message_parts.append(f"{len(upcoming_vehicles)} vehicles have maintenance due within 7 days:")
                for v in upcoming_vehicles[:5]:  # Show max 5
                    message_parts.append(f"- {v.license_plate} (Due: {v.next_maintenance_date})")

            message = "\n".join(message_parts)

            # Create notification for each admin/supervisor
            for user in users:
                notification_type = NotificationType.ERROR if overdue_vehicles else NotificationType.WARNING

                notification = Notification(
                    tenant_id=tenant_id,
                    user_id=user.id,
                    title=f"Vehicle Maintenance Alert ({len(tenant_vehicles)} vehicles)",
                    message=message,
                    type=notification_type,
                    category=NotificationCategory.MAINTENANCE,
                    action_url="/fleet/maintenance",
                    action_label="View Maintenance",
                )

                db.add(notification)
                db.flush()
                notification_count += 1

                # Send email notification
                try:
                    success, error = email_service.send_notification_email(
                        to_email=user.email,
                        to_name=user.full_name,
                        title=f"Vehicle Maintenance Alert",
                        message=message,
                        action_url=f"{get_app_url()}/fleet/maintenance",
                        action_label="View Maintenance",
                    )

                    notification.email_sent = success
                    if success:
                        notification.email_sent_at = datetime.utcnow()
                    else:
                        notification.email_error = error

                except Exception as e:
                    logger.error(f"Error sending maintenance email to {user.email}: {e}")

        db.commit()
        logger.info(f"Created {notification_count} notifications for pending maintenance")

    except Exception as e:
        logger.error(f"Error in check_pending_maintenance task: {e}")
        db.rollback()
        raise
    finally:
        db.close()

    return notification_count


@celery_app.task(bind=True, name="notifications.check_overdue_opportunities")
def check_overdue_opportunities(self):
    """
    Daily task to check for overdue opportunities and create notifications

    Schedule: Every day at 10:00 AM

    Logic:
    - Find opportunities with expected_close_date in the past that are still open
    - Create notifications for assigned sales reps
    - Send email alerts

    Returns:
        Number of notifications created
    """
    logger.info("Starting check_overdue_opportunities task")

    db = SessionLocal()
    notification_count = 0

    try:
        today = date.today()

        # Find overdue opportunities
        stmt = (
            select(Opportunity)
            .where(
                and_(
                    Opportunity.expected_close_date < today,
                    Opportunity.stage.notin_([
                        OpportunityStage.CLOSED_WON,
                        OpportunityStage.CLOSED_LOST
                    ]),
                    Opportunity.is_deleted == False
                )
            )
        )

        result = db.execute(stmt)
        overdue_opportunities = result.scalars().all()

        logger.info(f"Found {len(overdue_opportunities)} overdue opportunities")

        for opportunity in overdue_opportunities:
            # Get assigned user
            user_stmt = select(User).where(User.id == opportunity.assigned_to)
            user_result = db.execute(user_stmt)
            user = user_result.scalar_one_or_none()

            if not user:
                logger.warning(f"User not found for opportunity {opportunity.id}")
                continue

            days_overdue = (today - opportunity.expected_close_date).days

            # Create notification
            notification = Notification(
                tenant_id=opportunity.tenant_id,
                user_id=user.id,
                title="Opportunity Overdue",
                message=f"Opportunity '{opportunity.name}' is {days_overdue} days overdue (Expected: {opportunity.expected_close_date}). Please update the expected close date or close the opportunity.",
                type=NotificationType.WARNING,
                category=NotificationCategory.OPPORTUNITY,
                action_url=f"/opportunities/{opportunity.id}",
                action_label="Review Opportunity",
                related_entity_type="opportunity",
                related_entity_id=opportunity.id,
            )

            db.add(notification)
            db.flush()
            notification_count += 1

            # Send email notification
            try:
                success, error = email_service.send_notification_email(
                    to_email=user.email,
                    to_name=user.full_name,
                    title="Opportunity Overdue",
                    message=f"Opportunity '{opportunity.name}' is {days_overdue} days overdue.",
                    action_url=f"{get_app_url()}/opportunities/{opportunity.id}",
                    action_label="Review Opportunity",
                )

                notification.email_sent = success
                if success:
                    notification.email_sent_at = datetime.utcnow()
                else:
                    notification.email_error = error

            except Exception as e:
                logger.error(f"Error sending email for overdue opportunity {opportunity.id}: {e}")

        db.commit()
        logger.info(f"Created {notification_count} notifications for overdue opportunities")

    except Exception as e:
        logger.error(f"Error in check_overdue_opportunities task: {e}")
        db.rollback()
        raise
    finally:
        db.close()

    return notification_count


@celery_app.task(bind=True, name="notifications.send_weekly_summary")
def send_weekly_summary(self, user_id: str):
    """
    Weekly task to send summary email to user

    Schedule: Every Monday at 7:00 AM

    Args:
        user_id: UUID of user to send summary to

    Logic:
        - Gather weekly statistics
        - Send summary email with key metrics
        - Create in-app notification

    Returns:
        True if successful
    """
    logger.info(f"Starting send_weekly_summary task for user {user_id}")

    db = SessionLocal()

    try:
        user_uuid = UUID(user_id)

        # Get user
        user_stmt = select(User).where(User.id == user_uuid)
        user_result = db.execute(user_stmt)
        user = user_result.scalar_one_or_none()

        if not user:
            logger.error(f"User {user_id} not found")
            return False

        # Calculate date range (last 7 days)
        end_date = date.today()
        start_date = end_date - timedelta(days=7)

        # Gather statistics
        summary_data = {}

        # New opportunities
        new_opp_stmt = (
            select(func.count())
            .select_from(Opportunity)
            .where(
                and_(
                    Opportunity.assigned_to == user_uuid,
                    Opportunity.created_at >= start_date,
                    Opportunity.created_at < end_date,
                    Opportunity.is_deleted == False
                )
            )
        )
        summary_data['new_opportunities'] = db.execute(new_opp_stmt).scalar()

        # Won opportunities
        won_opp_stmt = (
            select(func.count())
            .select_from(Opportunity)
            .where(
                and_(
                    Opportunity.assigned_to == user_uuid,
                    Opportunity.stage == OpportunityStage.CLOSED_WON,
                    Opportunity.actual_close_date >= start_date,
                    Opportunity.actual_close_date < end_date,
                    Opportunity.is_deleted == False
                )
            )
        )
        summary_data['won_opportunities'] = db.execute(won_opp_stmt).scalar()

        # Total revenue (won opportunities)
        revenue_stmt = (
            select(func.sum(Opportunity.estimated_value))
            .where(
                and_(
                    Opportunity.assigned_to == user_uuid,
                    Opportunity.stage == OpportunityStage.CLOSED_WON,
                    Opportunity.actual_close_date >= start_date,
                    Opportunity.actual_close_date < end_date,
                    Opportunity.is_deleted == False
                )
            )
        )
        summary_data['total_revenue'] = db.execute(revenue_stmt).scalar() or 0

        # Active opportunities
        active_opp_stmt = (
            select(func.count())
            .select_from(Opportunity)
            .where(
                and_(
                    Opportunity.assigned_to == user_uuid,
                    Opportunity.stage.notin_([
                        OpportunityStage.CLOSED_WON,
                        OpportunityStage.CLOSED_LOST
                    ]),
                    Opportunity.is_deleted == False
                )
            )
        )
        summary_data['active_opportunities'] = db.execute(active_opp_stmt).scalar()

        # Weighted pipeline value
        weighted_stmt = (
            select(func.sum(Opportunity.estimated_value * Opportunity.probability / 100))
            .where(
                and_(
                    Opportunity.assigned_to == user_uuid,
                    Opportunity.stage.notin_([
                        OpportunityStage.CLOSED_WON,
                        OpportunityStage.CLOSED_LOST
                    ]),
                    Opportunity.is_deleted == False
                )
            )
        )
        summary_data['weighted_value'] = db.execute(weighted_stmt).scalar() or 0

        # Expiring quotes, overdue opportunities, etc.
        summary_data['expiring_quotes'] = 0  # TODO: Add quotes query
        summary_data['overdue_opportunities'] = 0  # TODO: Add overdue query
        summary_data['pending_maintenance'] = 0  # TODO: Add maintenance query

        # Send email
        success, error = email_service.send_weekly_summary_email(
            to_email=user.email,
            to_name=user.full_name,
            summary_data=summary_data,
        )

        if not success:
            logger.error(f"Failed to send weekly summary to {user.email}: {error}")
            return False

        logger.info(f"Successfully sent weekly summary to {user.email}")
        return True

    except Exception as e:
        logger.error(f"Error in send_weekly_summary task: {e}")
        raise
    finally:
        db.close()


@celery_app.task(bind=True, name="notifications.cleanup_old_notifications")
def cleanup_old_notifications(self):
    """
    Monthly task to clean up old read notifications

    Schedule: First day of each month at 2:00 AM

    Logic:
        - Delete read notifications older than 90 days
        - Keep unread notifications
        - Keep notifications related to active entities

    Returns:
        Number of notifications deleted
    """
    logger.info("Starting cleanup_old_notifications task")

    db = SessionLocal()
    total_deleted = 0

    try:
        # Get all tenants
        tenant_stmt = select(User.tenant_id).distinct()
        tenant_result = db.execute(tenant_stmt)
        tenant_ids = [row[0] for row in tenant_result.fetchall()]

        for tenant_id in tenant_ids:
            repo = NotificationRepository(db)
            deleted = repo.delete_old_notifications(
                tenant_id=tenant_id,
                days_old=90
            )
            total_deleted += deleted

        db.commit()
        logger.info(f"Cleaned up {total_deleted} old notifications")

    except Exception as e:
        logger.error(f"Error in cleanup_old_notifications task: {e}")
        db.rollback()
        raise
    finally:
        db.close()

    return total_deleted


def get_app_url() -> str:
    """Get application URL from settings"""
    from core.config import settings
    if settings.CORS_ORIGINS:
        return settings.CORS_ORIGINS[0]
    return "http://localhost:3000"

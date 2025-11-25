"""
Email service for sending notification emails via SendGrid
"""
import logging
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content, Personalization
from core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """
    Email service using SendGrid API

    Handles sending transactional emails for notifications,
    alerts, and system messages.
    """

    def __init__(self):
        """Initialize SendGrid client"""
        if not settings.SENDGRID_API_KEY:
            logger.warning("SENDGRID_API_KEY not configured. Email sending will fail.")
            self.client = None
        else:
            self.client = SendGridAPIClient(settings.SENDGRID_API_KEY)

    async def send_notification_email(
        self,
        to_email: str,
        to_name: str,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        action_label: Optional[str] = "View Details",
    ) -> tuple[bool, Optional[str]]:
        """
        Send a notification email

        Args:
            to_email: Recipient email address
            to_name: Recipient name
            title: Email subject / notification title
            message: Email body / notification message
            action_url: Optional URL for CTA button
            action_label: Optional label for CTA button

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        if not self.client:
            logger.error("SendGrid client not initialized. Check SENDGRID_API_KEY.")
            return False, "Email service not configured"

        try:
            # Build HTML email with template
            html_content = self._build_email_template(
                title=title,
                message=message,
                action_url=action_url,
                action_label=action_label,
                recipient_name=to_name,
            )

            # Create email message
            mail = Mail(
                from_email=Email(settings.FROM_EMAIL, settings.FROM_NAME),
                to_emails=To(to_email, to_name),
                subject=title,
                html_content=Content("text/html", html_content),
            )

            # Send email
            response = self.client.send(mail)

            # Check response
            if response.status_code in [200, 201, 202]:
                logger.info(f"Email sent successfully to {to_email}")
                return True, None
            else:
                error_msg = f"SendGrid returned status {response.status_code}"
                logger.error(f"Failed to send email to {to_email}: {error_msg}")
                return False, error_msg

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error sending email to {to_email}: {error_msg}")
            return False, error_msg

    async def send_bulk_notification_emails(
        self,
        recipients: list[dict[str, str]],  # [{"email": "...", "name": "..."}]
        title: str,
        message: str,
        action_url: Optional[str] = None,
        action_label: Optional[str] = "View Details",
    ) -> tuple[int, int]:
        """
        Send notification emails to multiple recipients

        Args:
            recipients: List of dicts with 'email' and 'name' keys
            title: Email subject / notification title
            message: Email body / notification message
            action_url: Optional URL for CTA button
            action_label: Optional label for CTA button

        Returns:
            Tuple of (success_count: int, failure_count: int)
        """
        success_count = 0
        failure_count = 0

        for recipient in recipients:
            email = recipient.get("email")
            name = recipient.get("name", "User")

            if not email:
                failure_count += 1
                continue

            success, error = await self.send_notification_email(
                to_email=email,
                to_name=name,
                title=title,
                message=message,
                action_url=action_url,
                action_label=action_label,
            )

            if success:
                success_count += 1
            else:
                failure_count += 1

        return success_count, failure_count

    def _build_email_template(
        self,
        title: str,
        message: str,
        recipient_name: str,
        action_url: Optional[str] = None,
        action_label: Optional[str] = "View Details",
    ) -> str:
        """
        Build HTML email template

        Args:
            title: Email title
            message: Email message
            recipient_name: Recipient name
            action_url: Optional CTA URL
            action_label: Optional CTA label

        Returns:
            HTML email content
        """
        # CTA button HTML
        cta_html = ""
        if action_url:
            cta_html = f"""
            <tr>
                <td align="center" style="padding: 20px 0;">
                    <a href="{action_url}"
                       style="background-color: #4F46E5; color: #ffffff; padding: 12px 24px;
                              text-decoration: none; border-radius: 6px; display: inline-block;
                              font-weight: 600;">
                        {action_label}
                    </a>
                </td>
            </tr>
            """

        # Full email template
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{title}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td align="center" style="padding: 40px 0;">
                        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                            <!-- Header -->
                            <tr>
                                <td style="background-color: #4F46E5; padding: 30px; text-align: center;">
                                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                                        {settings.FROM_NAME}
                                    </h1>
                                </td>
                            </tr>

                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px;">
                                    <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">
                                        Hi {recipient_name},
                                    </p>

                                    <h2 style="margin: 20px 0; color: #111827; font-size: 20px; font-weight: 600;">
                                        {title}
                                    </h2>

                                    <p style="margin: 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                                        {message}
                                    </p>
                                </td>
                            </tr>

                            <!-- CTA Button -->
                            {cta_html}

                            <!-- Footer -->
                            <tr>
                                <td style="background-color: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB;">
                                    <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 12px;">
                                        This is an automated notification from {settings.FROM_NAME}.
                                    </p>
                                    <p style="margin: 0; color: #6B7280; font-size: 12px;">
                                        © 2025 {settings.FROM_NAME}. All rights reserved.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        return html

    async def send_weekly_summary_email(
        self,
        to_email: str,
        to_name: str,
        summary_data: dict,
    ) -> tuple[bool, Optional[str]]:
        """
        Send weekly summary email to user

        Args:
            to_email: Recipient email address
            to_name: Recipient name
            summary_data: Dictionary with summary statistics

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        # Build summary message
        message = f"""
        Here's your weekly summary for the week:

        Sales Performance:
        - New Opportunities: {summary_data.get('new_opportunities', 0)}
        - Opportunities Won: {summary_data.get('won_opportunities', 0)}
        - Total Revenue: ${summary_data.get('total_revenue', 0):,.2f}

        Pipeline Status:
        - Active Opportunities: {summary_data.get('active_opportunities', 0)}
        - Weighted Pipeline Value: ${summary_data.get('weighted_value', 0):,.2f}

        Action Items:
        - Quotes Expiring Soon: {summary_data.get('expiring_quotes', 0)}
        - Overdue Opportunities: {summary_data.get('overdue_opportunities', 0)}
        - Pending Maintenance: {summary_data.get('pending_maintenance', 0)}
        """

        return await self.send_notification_email(
            to_email=to_email,
            to_name=to_name,
            title="Your Weekly OnQuota Summary",
            message=message,
            action_url=f"{settings.CORS_ORIGINS[0]}/dashboard" if settings.CORS_ORIGINS else None,
            action_label="View Dashboard",
        )


# Singleton instance
email_service = EmailService()

"""
Account Plan Export Service
Handles exporting account plans to PDF format
"""
import os
from datetime import datetime, date
from typing import List
from decimal import Decimal

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    PageBreak, Image, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from models.account_plan import AccountPlan, MilestoneStatus, SWOTCategory
from core.logging import get_logger

logger = get_logger(__name__)


class AccountPlanExporter:
    """
    Export account plans to professional PDF format

    Features:
    - Plan overview section
    - SWOT matrix visualization
    - Milestones timeline
    - Progress tracking
    - Professional formatting
    """

    def __init__(self, export_dir: str = "/Users/josegomez/Documents/Code/SaaS/07 - OnQuota/backend/exports"):
        """
        Initialize exporter

        Args:
            export_dir: Directory to save exported files
        """
        self.export_dir = export_dir
        os.makedirs(export_dir, exist_ok=True)

        # Define styles
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a237e'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Section header style
        self.styles.add(ParagraphStyle(
            name='SectionHeader',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=colors.HexColor('#283593'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))

        # Subsection style
        self.styles.add(ParagraphStyle(
            name='SubsectionHeader',
            parent=self.styles['Heading3'],
            fontSize=12,
            textColor=colors.HexColor('#3949ab'),
            spaceAfter=6,
            fontName='Helvetica-Bold'
        ))

        # Body text style
        self.styles.add(ParagraphStyle(
            name='BodyText',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=TA_JUSTIFY
        ))

    async def export_to_pdf(
        self,
        plan: AccountPlan,
        filename: str = None
    ) -> str:
        """
        Export account plan to professional PDF

        Sections:
        1. Plan Overview (title, client, dates, progress)
        2. SWOT Matrix (2x2 grid visualization)
        3. Milestones Timeline (visual timeline with status)
        4. Summary Statistics

        Args:
            plan: AccountPlan object to export
            filename: Optional filename (auto-generated if not provided)

        Returns:
            str: Full filepath to generated PDF file
        """
        try:
            # Generate filename if not provided
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                clean_title = "".join(c for c in plan.title if c.isalnum() or c in (' ', '-', '_')).strip()
                filename = f"account_plan_{clean_title}_{timestamp}.pdf"

            # Ensure .pdf extension
            if not filename.endswith('.pdf'):
                filename += '.pdf'

            filepath = os.path.join(self.export_dir, filename)

            # Create PDF document
            doc = SimpleDocTemplate(
                filepath,
                pagesize=letter,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18,
            )

            # Build document content
            story = []

            # Add sections
            story.extend(self._create_header_section(plan))
            story.append(Spacer(1, 0.3 * inch))

            story.extend(self._create_overview_section(plan))
            story.append(Spacer(1, 0.3 * inch))

            story.extend(self._create_swot_section(plan))
            story.append(Spacer(1, 0.3 * inch))

            story.extend(self._create_milestones_section(plan))
            story.append(Spacer(1, 0.3 * inch))

            story.extend(self._create_statistics_section(plan))

            # Build PDF
            doc.build(story)

            logger.info(f"Exported account plan '{plan.title}' to {filepath}")

            return filepath

        except Exception as e:
            logger.error(f"Error exporting account plan to PDF: {str(e)}")
            raise

    def _create_header_section(self, plan: AccountPlan) -> List:
        """Create PDF header with title and date"""
        elements = []

        # Title
        title = Paragraph(f"Account Plan: {plan.title}", self.styles['CustomTitle'])
        elements.append(title)

        # Client and date info
        client_name = plan.client.name if plan.client else "N/A"
        creator_name = plan.creator.full_name if plan.creator else "N/A"

        info_data = [
            ["Client:", client_name, "Status:", plan.status.value.upper()],
            ["Created by:", creator_name, "Created:", plan.created_at.strftime("%Y-%m-%d")],
            ["Start Date:", plan.start_date.strftime("%Y-%m-%d"), "End Date:",
             plan.end_date.strftime("%Y-%m-%d") if plan.end_date else "N/A"],
        ]

        info_table = Table(info_data, colWidths=[1.5 * inch, 2.0 * inch, 1.5 * inch, 2.0 * inch])
        info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#424242')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        elements.append(info_table)

        # Horizontal line separator
        elements.append(Spacer(1, 0.2 * inch))

        return elements

    def _create_overview_section(self, plan: AccountPlan) -> List:
        """Create plan overview section"""
        elements = []

        # Section header
        header = Paragraph("Plan Overview", self.styles['SectionHeader'])
        elements.append(header)

        # Description
        if plan.description:
            desc = Paragraph(plan.description, self.styles['BodyText'])
            elements.append(desc)
        else:
            desc = Paragraph("<i>No description provided</i>", self.styles['BodyText'])
            elements.append(desc)

        elements.append(Spacer(1, 0.1 * inch))

        # Key metrics table
        progress = plan.progress_percentage
        revenue_goal_str = f"${plan.revenue_goal:,.2f}" if plan.revenue_goal else "N/A"

        metrics_data = [
            ["Metric", "Value"],
            ["Revenue Goal", revenue_goal_str],
            ["Total Milestones", str(plan.milestones_count)],
            ["Completed Milestones", str(plan.completed_milestones_count)],
            ["Progress", f"{progress:.1f}%"],
        ]

        metrics_table = Table(metrics_data, colWidths=[3 * inch, 3 * inch])
        metrics_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3949ab')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            # Data rows
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 1), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),
            # Grid
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))

        elements.append(metrics_table)

        return elements

    def _create_swot_section(self, plan: AccountPlan) -> List:
        """Create SWOT analysis matrix"""
        elements = []

        # Section header
        header = Paragraph("SWOT Analysis", self.styles['SectionHeader'])
        elements.append(header)

        # Organize SWOT items by category
        swot_data = {
            SWOTCategory.STRENGTH: [],
            SWOTCategory.WEAKNESS: [],
            SWOTCategory.OPPORTUNITY: [],
            SWOTCategory.THREAT: []
        }

        for item in plan.swot_items:
            if not item.is_deleted:
                swot_data[item.category].append(item.description)

        # Create SWOT matrix (2x2 grid)
        def format_swot_items(items: List[str]) -> str:
            if not items:
                return "<i>None</i>"
            bullets = ["• " + item for item in items]
            return "<br/>".join(bullets)

        strengths_text = format_swot_items(swot_data[SWOTCategory.STRENGTH])
        weaknesses_text = format_swot_items(swot_data[SWOTCategory.WEAKNESS])
        opportunities_text = format_swot_items(swot_data[SWOTCategory.OPPORTUNITY])
        threats_text = format_swot_items(swot_data[SWOTCategory.THREAT])

        swot_matrix = [
            [
                Paragraph("<b>STRENGTHS</b>", self.styles['SubsectionHeader']),
                Paragraph("<b>WEAKNESSES</b>", self.styles['SubsectionHeader'])
            ],
            [
                Paragraph(strengths_text, self.styles['BodyText']),
                Paragraph(weaknesses_text, self.styles['BodyText'])
            ],
            [
                Paragraph("<b>OPPORTUNITIES</b>", self.styles['SubsectionHeader']),
                Paragraph("<b>THREATS</b>", self.styles['SubsectionHeader'])
            ],
            [
                Paragraph(opportunities_text, self.styles['BodyText']),
                Paragraph(threats_text, self.styles['BodyText'])
            ],
        ]

        swot_table = Table(swot_matrix, colWidths=[3.25 * inch, 3.25 * inch])
        swot_table.setStyle(TableStyle([
            # Header cells (strengths/weaknesses)
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4caf50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            # Content cells (strengths/weaknesses)
            ('BACKGROUND', (0, 1), (0, 1), colors.HexColor('#c8e6c9')),
            ('BACKGROUND', (1, 1), (1, 1), colors.HexColor('#ffccbc')),
            # Header cells (opportunities/threats)
            ('BACKGROUND', (0, 2), (-1, 2), colors.HexColor('#2196f3')),
            ('TEXTCOLOR', (0, 2), (-1, 2), colors.whitesmoke),
            ('ALIGN', (0, 2), (-1, 2), 'CENTER'),
            # Content cells (opportunities/threats)
            ('BACKGROUND', (0, 3), (0, 3), colors.HexColor('#bbdefb')),
            ('BACKGROUND', (1, 3), (1, 3), colors.HexColor('#ffcdd2')),
            # Grid and padding
            ('GRID', (0, 0), (-1, -1), 2, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))

        elements.append(swot_table)

        return elements

    def _create_milestones_section(self, plan: AccountPlan) -> List:
        """Create milestones timeline section"""
        elements = []

        # Section header
        header = Paragraph("Milestones Timeline", self.styles['SectionHeader'])
        elements.append(header)

        if not plan.milestones or all(m.is_deleted for m in plan.milestones):
            no_milestones = Paragraph("<i>No milestones defined</i>", self.styles['BodyText'])
            elements.append(no_milestones)
            return elements

        # Prepare milestone data
        milestones_data = [["Title", "Due Date", "Status", "Completion"]]

        # Sort milestones by due date
        active_milestones = [m for m in plan.milestones if not m.is_deleted]
        sorted_milestones = sorted(active_milestones, key=lambda m: m.due_date)

        for milestone in sorted_milestones:
            status_color = self._get_status_color(milestone.status)
            status_text = f'<font color="{status_color}"><b>{milestone.status.value.upper()}</b></font>'

            completion = "N/A"
            if milestone.completion_date:
                completion = milestone.completion_date.strftime("%Y-%m-%d")

            milestones_data.append([
                milestone.title,
                milestone.due_date.strftime("%Y-%m-%d"),
                Paragraph(status_text, self.styles['BodyText']),
                completion
            ])

        milestone_table = Table(
            milestones_data,
            colWidths=[2.5 * inch, 1.2 * inch, 1.3 * inch, 1.5 * inch]
        )
        milestone_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3949ab')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('ALIGN', (1, 1), (-1, -1), 'CENTER'),
            # Alternating row colors
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
            # Grid
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))

        elements.append(milestone_table)

        return elements

    def _create_statistics_section(self, plan: AccountPlan) -> List:
        """Create summary statistics section"""
        elements = []

        # Section header
        header = Paragraph("Summary Statistics", self.styles['SectionHeader'])
        elements.append(header)

        # Calculate statistics
        total_milestones = plan.milestones_count
        completed = plan.completed_milestones_count
        pending = len([m for m in plan.milestones
                      if not m.is_deleted and m.status == MilestoneStatus.PENDING])
        in_progress = len([m for m in plan.milestones
                          if not m.is_deleted and m.status == MilestoneStatus.IN_PROGRESS])
        overdue = len([m for m in plan.milestones
                      if not m.is_deleted and m.is_overdue])

        total_swot = len([s for s in plan.swot_items if not s.is_deleted])
        strengths = len([s for s in plan.swot_items
                        if not s.is_deleted and s.category == SWOTCategory.STRENGTH])
        weaknesses = len([s for s in plan.swot_items
                         if not s.is_deleted and s.category == SWOTCategory.WEAKNESS])
        opportunities = len([s for s in plan.swot_items
                            if not s.is_deleted and s.category == SWOTCategory.OPPORTUNITY])
        threats = len([s for s in plan.swot_items
                      if not s.is_deleted and s.category == SWOTCategory.THREAT])

        # Calculate days remaining
        days_remaining = "N/A"
        if plan.end_date:
            delta = plan.end_date - date.today()
            days_remaining = f"{delta.days} days"

        stats_data = [
            ["Category", "Metric", "Value"],
            ["Milestones", "Total", str(total_milestones)],
            ["", "Completed", str(completed)],
            ["", "In Progress", str(in_progress)],
            ["", "Pending", str(pending)],
            ["", "Overdue", str(overdue)],
            ["SWOT Items", "Total", str(total_swot)],
            ["", "Strengths", str(strengths)],
            ["", "Weaknesses", str(weaknesses)],
            ["", "Opportunities", str(opportunities)],
            ["", "Threats", str(threats)],
            ["Timeline", "Days Remaining", days_remaining],
        ]

        stats_table = Table(stats_data, colWidths=[1.5 * inch, 2.5 * inch, 2.5 * inch])
        stats_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3949ab')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            # Data rows
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),
            # Grid
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))

        elements.append(stats_table)

        # Footer
        elements.append(Spacer(1, 0.3 * inch))
        footer_text = f"<i>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</i>"
        footer = Paragraph(footer_text, self.styles['BodyText'])
        elements.append(footer)

        return elements

    def _get_status_color(self, status: MilestoneStatus) -> str:
        """Get color code for milestone status"""
        color_map = {
            MilestoneStatus.PENDING: "#9e9e9e",
            MilestoneStatus.IN_PROGRESS: "#2196f3",
            MilestoneStatus.COMPLETED: "#4caf50",
            MilestoneStatus.CANCELLED: "#f44336",
        }
        return color_map.get(status, "#000000")

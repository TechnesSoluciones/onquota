"""Database models package"""
from models.base import Base, BaseModel
from models.tenant import Tenant
from models.user import User, UserRole
from models.refresh_token import RefreshToken
from models.expense_category import ExpenseCategory
from models.expense import Expense, ExpenseStatus
from models.quote import Quote, SaleStatus
from models.quote_item import QuoteItem
from models.transport import (
    Vehicle,
    VehicleType,
    VehicleStatus,
    Shipment,
    ShipmentStatus,
    ShipmentExpense,
    ExpenseType,
)
from models.client import Client, ClientStatus, ClientType, Industry
from models.ocr_job import OCRJob, OCRJobStatus
from models.notification import Notification, NotificationType, NotificationCategory
from models.opportunity import Opportunity, OpportunityStage
from models.analysis import Analysis, AnalysisStatus, FileType
from models.account_plan import AccountPlan, Milestone, SWOTItem, PlanStatus, MilestoneStatus, SWOTCategory
from models.visit import (
    Visit,
    Call,
    VisitStatus,
    VisitType,
    CallType,
    CallStatus,
    VisitTopic,
    VisitTopicDetail,
    VisitOpportunity,
    Commitment,
    CommitmentType,
    CommitmentPriority,
    CommitmentStatus,
)
from models.spa import SPAAgreement, SPAUploadLog
from models.quotation import Quotation, QuoteStatus
from models.sales_control import (
    SalesControl,
    SalesControlStatus,
    SalesProductLine,
    SalesControlLine,
)
from models.quota import Quota, QuotaLine

# All models must be imported here for Alembic autogenerate to work
__all__ = [
    "Base",
    "BaseModel",
    "Tenant",
    "User",
    "UserRole",
    "RefreshToken",
    "ExpenseCategory",
    "Expense",
    "ExpenseStatus",
    "Quote",
    "QuoteItem",
    "SaleStatus",
    "Vehicle",
    "VehicleType",
    "VehicleStatus",
    "Shipment",
    "ShipmentStatus",
    "ShipmentExpense",
    "ExpenseType",
    "Client",
    "ClientStatus",
    "ClientType",
    "Industry",
    "OCRJob",
    "OCRJobStatus",
    "Notification",
    "NotificationType",
    "NotificationCategory",
    "Opportunity",
    "OpportunityStage",
    "Analysis",
    "AnalysisStatus",
    "FileType",
    "AccountPlan",
    "Milestone",
    "SWOTItem",
    "PlanStatus",
    "MilestoneStatus",
    "SWOTCategory",
    "Visit",
    "Call",
    "VisitStatus",
    "VisitType",
    "CallType",
    "CallStatus",
    "VisitTopic",
    "VisitTopicDetail",
    "VisitOpportunity",
    "Commitment",
    "CommitmentType",
    "CommitmentPriority",
    "CommitmentStatus",
    "SPAAgreement",
    "SPAUploadLog",
    "Quotation",
    "QuoteStatus",
    "SalesControl",
    "SalesControlStatus",
    "SalesProductLine",
    "SalesControlLine",
    "Quota",
    "QuotaLine",
]

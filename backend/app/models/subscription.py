"""Subscription and billing models."""
from sqlalchemy import Column, String, DateTime, Enum, Text, Integer, ForeignKey, Boolean, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
import enum

from app.db.base import Base


class PlanType(str, enum.Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class BillingCycle(str, enum.Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class SubscriptionStatus(str, enum.Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"
    TRIAL = "trial"


class SubscriptionPlan(Base):
    """Available subscription plans."""
    __tablename__ = "subscription_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Plan info
    name = Column(String(100), nullable=False)
    plan_type = Column(Enum(PlanType), nullable=False, unique=True)
    description = Column(Text, nullable=True)

    # Pricing
    price_monthly = Column(Numeric(10, 2), default=0)
    price_yearly = Column(Numeric(10, 2), default=0)
    currency = Column(String(3), default="KRW")

    # Features/Limits
    max_contracts = Column(Integer, nullable=True)  # None = unlimited
    max_analyses_per_month = Column(Integer, nullable=True)
    max_signatures_per_month = Column(Integer, nullable=True)
    max_blockchain_anchors = Column(Integer, nullable=True)
    max_storage_mb = Column(Integer, default=100)
    max_team_members = Column(Integer, default=1)

    # Feature flags
    has_ai_analysis = Column(Boolean, default=True)
    has_did_signing = Column(Boolean, default=False)
    has_blockchain_anchoring = Column(Boolean, default=False)
    has_premium_templates = Column(Boolean, default=False)
    has_api_access = Column(Boolean, default=False)
    has_priority_support = Column(Boolean, default=False)
    has_white_label = Column(Boolean, default=False)

    # Status
    is_active = Column(Boolean, default=True)
    is_visible = Column(Boolean, default=True)
    trial_days = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserSubscription(Base):
    """User subscription status."""
    __tablename__ = "user_subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=False)

    # Subscription details
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE)
    billing_cycle = Column(Enum(BillingCycle), default=BillingCycle.MONTHLY)

    # Dates
    started_at = Column(DateTime, default=datetime.utcnow)
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    trial_end = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    # Payment
    stripe_subscription_id = Column(String(255), nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    plan = relationship("SubscriptionPlan")


class UsageRecord(Base):
    """Track user usage for billing and limits."""
    __tablename__ = "usage_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    # Usage period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)

    # Usage counts
    contracts_created = Column(Integer, default=0)
    analyses_performed = Column(Integer, default=0)
    signatures_made = Column(Integer, default=0)
    blockchain_anchors = Column(Integer, default=0)
    storage_used_mb = Column(Integer, default=0)
    api_calls = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    user = relationship("User")


class Payment(Base):
    """Payment transaction records."""
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("user_subscriptions.id"), nullable=True)

    # Payment details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="KRW")
    status = Column(Enum(PaymentStatus), default=PaymentStatus.PENDING)

    # Payment method
    payment_method = Column(String(50), nullable=True)  # card, bank_transfer
    payment_provider = Column(String(50), nullable=True)  # stripe, toss, nicepay

    # External references
    provider_payment_id = Column(String(255), nullable=True)
    provider_invoice_id = Column(String(255), nullable=True)
    receipt_url = Column(String(500), nullable=True)

    # Metadata
    description = Column(Text, nullable=True)
    metadata = Column(JSONB, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    failed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User")
    subscription = relationship("UserSubscription")


class Invoice(Base):
    """Generated invoices."""
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=True)

    # Invoice details
    invoice_number = Column(String(50), unique=True, nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    tax_amount = Column(Numeric(10, 2), default=0)
    total_amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="KRW")

    # Period
    period_start = Column(DateTime, nullable=True)
    period_end = Column(DateTime, nullable=True)

    # Status
    is_paid = Column(Boolean, default=False)
    paid_at = Column(DateTime, nullable=True)

    # PDF
    pdf_url = Column(String(500), nullable=True)

    # Timestamps
    issued_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User")
    payment = relationship("Payment")

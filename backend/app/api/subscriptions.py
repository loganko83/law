"""Subscription management API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from decimal import Decimal

from app.db.base import get_db
from app.models.user import User, SubscriptionTier
from app.models.subscription import (
    SubscriptionPlan, UserSubscription, UsageRecord, Payment, Invoice,
    PlanType, BillingCycle, SubscriptionStatus, PaymentStatus
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


# ==================== Schemas ====================

class PlanResponse(BaseModel):
    id: UUID
    name: str
    plan_type: str
    description: Optional[str]
    price_monthly: float
    price_yearly: float
    currency: str

    # Limits
    max_contracts: Optional[int]
    max_analyses_per_month: Optional[int]
    max_signatures_per_month: Optional[int]
    max_blockchain_anchors: Optional[int]
    max_storage_mb: int

    # Features
    has_ai_analysis: bool
    has_did_signing: bool
    has_blockchain_anchoring: bool
    has_premium_templates: bool
    has_api_access: bool
    has_priority_support: bool

    trial_days: int

    class Config:
        from_attributes = True


class SubscriptionResponse(BaseModel):
    id: UUID
    plan: PlanResponse
    status: str
    billing_cycle: str
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    trial_end: Optional[datetime]
    started_at: datetime

    class Config:
        from_attributes = True


class CreateSubscriptionRequest(BaseModel):
    plan_type: str
    billing_cycle: str = "monthly"
    payment_method_id: Optional[str] = None  # For Stripe


class UsageResponse(BaseModel):
    period_start: datetime
    period_end: datetime
    contracts_created: int
    analyses_performed: int
    signatures_made: int
    blockchain_anchors: int
    storage_used_mb: int
    api_calls: int

    # Limits
    contracts_limit: Optional[int]
    analyses_limit: Optional[int]
    signatures_limit: Optional[int]
    anchors_limit: Optional[int]
    storage_limit: int


class InvoiceResponse(BaseModel):
    id: UUID
    invoice_number: str
    amount: float
    tax_amount: float
    total_amount: float
    currency: str
    is_paid: bool
    issued_at: datetime
    due_date: Optional[datetime]
    pdf_url: Optional[str]

    class Config:
        from_attributes = True


# ==================== Helper Functions ====================

async def get_or_create_usage_record(
    db: AsyncSession,
    user_id: UUID,
    plan: SubscriptionPlan
) -> UsageRecord:
    """Get current month's usage record or create new one."""
    now = datetime.utcnow()
    period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        period_end = period_start.replace(year=now.year + 1, month=1)
    else:
        period_end = period_start.replace(month=now.month + 1)

    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.user_id == user_id,
            UsageRecord.period_start == period_start
        )
    )
    usage = result.scalar_one_or_none()

    if not usage:
        usage = UsageRecord(
            user_id=user_id,
            period_start=period_start,
            period_end=period_end
        )
        db.add(usage)
        await db.flush()

    return usage


async def check_usage_limit(
    db: AsyncSession,
    user_id: UUID,
    usage_type: str
) -> bool:
    """Check if user has exceeded their usage limit."""
    # Get subscription
    result = await db.execute(
        select(UserSubscription)
        .options(selectinload(UserSubscription.plan))
        .where(UserSubscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        # Free tier defaults
        return True

    plan = subscription.plan
    usage = await get_or_create_usage_record(db, user_id, plan)

    limits = {
        "contracts": (usage.contracts_created, plan.max_contracts),
        "analyses": (usage.analyses_performed, plan.max_analyses_per_month),
        "signatures": (usage.signatures_made, plan.max_signatures_per_month),
        "anchors": (usage.blockchain_anchors, plan.max_blockchain_anchors),
    }

    if usage_type not in limits:
        return True

    current, limit = limits[usage_type]
    if limit is None:
        return True  # Unlimited

    return current < limit


async def increment_usage(
    db: AsyncSession,
    user_id: UUID,
    usage_type: str,
    amount: int = 1
):
    """Increment usage counter."""
    result = await db.execute(
        select(UserSubscription)
        .options(selectinload(UserSubscription.plan))
        .where(UserSubscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()

    plan = subscription.plan if subscription else None
    usage = await get_or_create_usage_record(db, user_id, plan)

    if usage_type == "contracts":
        usage.contracts_created += amount
    elif usage_type == "analyses":
        usage.analyses_performed += amount
    elif usage_type == "signatures":
        usage.signatures_made += amount
    elif usage_type == "anchors":
        usage.blockchain_anchors += amount
    elif usage_type == "api_calls":
        usage.api_calls += amount

    await db.flush()


# ==================== Endpoints ====================

@router.get("/plans", response_model=List[PlanResponse])
async def list_plans(
    db: AsyncSession = Depends(get_db)
):
    """Get all available subscription plans."""
    result = await db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active == True, SubscriptionPlan.is_visible == True)
        .order_by(SubscriptionPlan.price_monthly)
    )
    plans = result.scalars().all()

    return [
        PlanResponse(
            id=p.id,
            name=p.name,
            plan_type=p.plan_type.value,
            description=p.description,
            price_monthly=float(p.price_monthly),
            price_yearly=float(p.price_yearly),
            currency=p.currency,
            max_contracts=p.max_contracts,
            max_analyses_per_month=p.max_analyses_per_month,
            max_signatures_per_month=p.max_signatures_per_month,
            max_blockchain_anchors=p.max_blockchain_anchors,
            max_storage_mb=p.max_storage_mb,
            has_ai_analysis=p.has_ai_analysis,
            has_did_signing=p.has_did_signing,
            has_blockchain_anchoring=p.has_blockchain_anchoring,
            has_premium_templates=p.has_premium_templates,
            has_api_access=p.has_api_access,
            has_priority_support=p.has_priority_support,
            trial_days=p.trial_days
        )
        for p in plans
    ]


@router.get("/current", response_model=SubscriptionResponse)
async def get_current_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's subscription."""
    result = await db.execute(
        select(UserSubscription)
        .options(selectinload(UserSubscription.plan))
        .where(UserSubscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        # Return free tier info
        result = await db.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.plan_type == PlanType.FREE)
        )
        free_plan = result.scalar_one_or_none()

        if not free_plan:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No subscription found"
            )

        return SubscriptionResponse(
            id=UUID("00000000-0000-0000-0000-000000000000"),
            plan=PlanResponse(
                id=free_plan.id,
                name=free_plan.name,
                plan_type=free_plan.plan_type.value,
                description=free_plan.description,
                price_monthly=float(free_plan.price_monthly),
                price_yearly=float(free_plan.price_yearly),
                currency=free_plan.currency,
                max_contracts=free_plan.max_contracts,
                max_analyses_per_month=free_plan.max_analyses_per_month,
                max_signatures_per_month=free_plan.max_signatures_per_month,
                max_blockchain_anchors=free_plan.max_blockchain_anchors,
                max_storage_mb=free_plan.max_storage_mb,
                has_ai_analysis=free_plan.has_ai_analysis,
                has_did_signing=free_plan.has_did_signing,
                has_blockchain_anchoring=free_plan.has_blockchain_anchoring,
                has_premium_templates=free_plan.has_premium_templates,
                has_api_access=free_plan.has_api_access,
                has_priority_support=free_plan.has_priority_support,
                trial_days=free_plan.trial_days
            ),
            status="active",
            billing_cycle="monthly",
            current_period_start=None,
            current_period_end=None,
            trial_end=None,
            started_at=current_user.created_at
        )

    return SubscriptionResponse(
        id=subscription.id,
        plan=PlanResponse(
            id=subscription.plan.id,
            name=subscription.plan.name,
            plan_type=subscription.plan.plan_type.value,
            description=subscription.plan.description,
            price_monthly=float(subscription.plan.price_monthly),
            price_yearly=float(subscription.plan.price_yearly),
            currency=subscription.plan.currency,
            max_contracts=subscription.plan.max_contracts,
            max_analyses_per_month=subscription.plan.max_analyses_per_month,
            max_signatures_per_month=subscription.plan.max_signatures_per_month,
            max_blockchain_anchors=subscription.plan.max_blockchain_anchors,
            max_storage_mb=subscription.plan.max_storage_mb,
            has_ai_analysis=subscription.plan.has_ai_analysis,
            has_did_signing=subscription.plan.has_did_signing,
            has_blockchain_anchoring=subscription.plan.has_blockchain_anchoring,
            has_premium_templates=subscription.plan.has_premium_templates,
            has_api_access=subscription.plan.has_api_access,
            has_priority_support=subscription.plan.has_priority_support,
            trial_days=subscription.plan.trial_days
        ),
        status=subscription.status.value,
        billing_cycle=subscription.billing_cycle.value,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        trial_end=subscription.trial_end,
        started_at=subscription.started_at
    )


@router.post("/subscribe", response_model=SubscriptionResponse)
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Subscribe to a plan."""
    # Validate plan type
    try:
        plan_type = PlanType(request.plan_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type. Must be one of: {[p.value for p in PlanType]}"
        )

    # Get plan
    result = await db.execute(
        select(SubscriptionPlan).where(
            SubscriptionPlan.plan_type == plan_type,
            SubscriptionPlan.is_active == True
        )
    )
    plan = result.scalar_one_or_none()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Plan not found"
        )

    # Check existing subscription
    result = await db.execute(
        select(UserSubscription).where(UserSubscription.user_id == current_user.id)
    )
    existing = result.scalar_one_or_none()

    if existing and existing.status == SubscriptionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Already have an active subscription. Please cancel first or upgrade."
        )

    # Validate billing cycle
    try:
        billing_cycle = BillingCycle(request.billing_cycle)
    except ValueError:
        billing_cycle = BillingCycle.MONTHLY

    # Calculate period
    now = datetime.utcnow()
    if billing_cycle == BillingCycle.YEARLY:
        period_end = now + timedelta(days=365)
    else:
        period_end = now + timedelta(days=30)

    # Handle trial
    trial_end = None
    subscription_status = SubscriptionStatus.ACTIVE
    if plan.trial_days > 0:
        trial_end = now + timedelta(days=plan.trial_days)
        subscription_status = SubscriptionStatus.TRIAL

    # Create subscription
    subscription = UserSubscription(
        user_id=current_user.id,
        plan_id=plan.id,
        status=subscription_status,
        billing_cycle=billing_cycle,
        started_at=now,
        current_period_start=now,
        current_period_end=period_end,
        trial_end=trial_end
    )

    db.add(subscription)

    # Update user tier
    tier_mapping = {
        PlanType.FREE: SubscriptionTier.FREE,
        PlanType.BASIC: SubscriptionTier.BASIC,
        PlanType.PRO: SubscriptionTier.PRO,
        PlanType.ENTERPRISE: SubscriptionTier.PRO
    }
    current_user.subscription_tier = tier_mapping.get(plan_type, SubscriptionTier.FREE)

    await db.flush()

    return SubscriptionResponse(
        id=subscription.id,
        plan=PlanResponse(
            id=plan.id,
            name=plan.name,
            plan_type=plan.plan_type.value,
            description=plan.description,
            price_monthly=float(plan.price_monthly),
            price_yearly=float(plan.price_yearly),
            currency=plan.currency,
            max_contracts=plan.max_contracts,
            max_analyses_per_month=plan.max_analyses_per_month,
            max_signatures_per_month=plan.max_signatures_per_month,
            max_blockchain_anchors=plan.max_blockchain_anchors,
            max_storage_mb=plan.max_storage_mb,
            has_ai_analysis=plan.has_ai_analysis,
            has_did_signing=plan.has_did_signing,
            has_blockchain_anchoring=plan.has_blockchain_anchoring,
            has_premium_templates=plan.has_premium_templates,
            has_api_access=plan.has_api_access,
            has_priority_support=plan.has_priority_support,
            trial_days=plan.trial_days
        ),
        status=subscription.status.value,
        billing_cycle=subscription.billing_cycle.value,
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        trial_end=subscription.trial_end,
        started_at=subscription.started_at
    )


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel current subscription."""
    result = await db.execute(
        select(UserSubscription).where(
            UserSubscription.user_id == current_user.id,
            UserSubscription.status == SubscriptionStatus.ACTIVE
        )
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active subscription found"
        )

    subscription.status = SubscriptionStatus.CANCELLED
    subscription.cancelled_at = datetime.utcnow()

    # Downgrade user tier
    current_user.subscription_tier = SubscriptionTier.FREE

    await db.flush()

    return {
        "message": "Subscription cancelled successfully",
        "effective_until": subscription.current_period_end
    }


@router.get("/usage", response_model=UsageResponse)
async def get_usage(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current usage statistics."""
    # Get subscription and plan
    result = await db.execute(
        select(UserSubscription)
        .options(selectinload(UserSubscription.plan))
        .where(UserSubscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    # Get or create usage record
    plan = subscription.plan if subscription else None
    usage = await get_or_create_usage_record(db, current_user.id, plan)

    # Default limits for free tier
    contracts_limit = 5
    analyses_limit = 10
    signatures_limit = 5
    anchors_limit = 0
    storage_limit = 100

    if plan:
        contracts_limit = plan.max_contracts
        analyses_limit = plan.max_analyses_per_month
        signatures_limit = plan.max_signatures_per_month
        anchors_limit = plan.max_blockchain_anchors
        storage_limit = plan.max_storage_mb

    return UsageResponse(
        period_start=usage.period_start,
        period_end=usage.period_end,
        contracts_created=usage.contracts_created,
        analyses_performed=usage.analyses_performed,
        signatures_made=usage.signatures_made,
        blockchain_anchors=usage.blockchain_anchors,
        storage_used_mb=usage.storage_used_mb,
        api_calls=usage.api_calls,
        contracts_limit=contracts_limit,
        analyses_limit=analyses_limit,
        signatures_limit=signatures_limit,
        anchors_limit=anchors_limit,
        storage_limit=storage_limit
    )


@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's invoices."""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.user_id == current_user.id)
        .order_by(Invoice.issued_at.desc())
        .offset(skip)
        .limit(limit)
    )
    invoices = result.scalars().all()

    return [
        InvoiceResponse(
            id=inv.id,
            invoice_number=inv.invoice_number,
            amount=float(inv.amount),
            tax_amount=float(inv.tax_amount),
            total_amount=float(inv.total_amount),
            currency=inv.currency,
            is_paid=inv.is_paid,
            issued_at=inv.issued_at,
            due_date=inv.due_date,
            pdf_url=inv.pdf_url
        )
        for inv in invoices
    ]


@router.post("/upgrade")
async def upgrade_subscription(
    new_plan_type: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upgrade to a higher tier plan."""
    # Validate new plan
    try:
        plan_type = PlanType(new_plan_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid plan type"
        )

    # Get current subscription
    result = await db.execute(
        select(UserSubscription)
        .options(selectinload(UserSubscription.plan))
        .where(UserSubscription.user_id == current_user.id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No subscription found. Please subscribe first."
        )

    # Get new plan
    result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.plan_type == plan_type)
    )
    new_plan = result.scalar_one_or_none()

    if not new_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="New plan not found"
        )

    # Check if upgrade
    plan_order = {PlanType.FREE: 0, PlanType.BASIC: 1, PlanType.PRO: 2, PlanType.ENTERPRISE: 3}
    if plan_order.get(plan_type, 0) <= plan_order.get(subscription.plan.plan_type, 0):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only upgrade to a higher tier"
        )

    # Update subscription
    subscription.plan_id = new_plan.id

    # Update user tier
    tier_mapping = {
        PlanType.FREE: SubscriptionTier.FREE,
        PlanType.BASIC: SubscriptionTier.BASIC,
        PlanType.PRO: SubscriptionTier.PRO,
        PlanType.ENTERPRISE: SubscriptionTier.PRO
    }
    current_user.subscription_tier = tier_mapping.get(plan_type, SubscriptionTier.FREE)

    await db.flush()

    return {
        "message": f"Upgraded to {new_plan.name} plan",
        "new_plan": new_plan.name
    }

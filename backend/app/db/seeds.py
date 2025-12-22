"""Database seed data for initial setup."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from decimal import Decimal

from app.models.subscription import SubscriptionPlan, PlanType


async def seed_subscription_plans(db: AsyncSession):
    """Seed default subscription plans."""

    # Check if plans already exist
    result = await db.execute(select(SubscriptionPlan))
    existing = result.scalars().all()
    if existing:
        return

    plans = [
        SubscriptionPlan(
            name="Free",
            plan_type=PlanType.FREE,
            description="Get started with basic contract analysis",
            price_monthly=Decimal("0"),
            price_yearly=Decimal("0"),
            currency="KRW",
            max_contracts=5,
            max_analyses_per_month=10,
            max_signatures_per_month=5,
            max_blockchain_anchors=0,
            max_storage_mb=100,
            max_team_members=1,
            has_ai_analysis=True,
            has_did_signing=False,
            has_blockchain_anchoring=False,
            has_premium_templates=False,
            has_api_access=False,
            has_priority_support=False,
            has_white_label=False,
            is_active=True,
            is_visible=True,
            trial_days=0
        ),
        SubscriptionPlan(
            name="Basic",
            plan_type=PlanType.BASIC,
            description="Perfect for individuals and small businesses",
            price_monthly=Decimal("29000"),
            price_yearly=Decimal("290000"),
            currency="KRW",
            max_contracts=50,
            max_analyses_per_month=100,
            max_signatures_per_month=50,
            max_blockchain_anchors=10,
            max_storage_mb=1000,
            max_team_members=3,
            has_ai_analysis=True,
            has_did_signing=True,
            has_blockchain_anchoring=True,
            has_premium_templates=False,
            has_api_access=False,
            has_priority_support=False,
            has_white_label=False,
            is_active=True,
            is_visible=True,
            trial_days=14
        ),
        SubscriptionPlan(
            name="Pro",
            plan_type=PlanType.PRO,
            description="Advanced features for professionals",
            price_monthly=Decimal("99000"),
            price_yearly=Decimal("990000"),
            currency="KRW",
            max_contracts=None,  # Unlimited
            max_analyses_per_month=None,  # Unlimited
            max_signatures_per_month=None,  # Unlimited
            max_blockchain_anchors=100,
            max_storage_mb=10000,
            max_team_members=10,
            has_ai_analysis=True,
            has_did_signing=True,
            has_blockchain_anchoring=True,
            has_premium_templates=True,
            has_api_access=True,
            has_priority_support=True,
            has_white_label=False,
            is_active=True,
            is_visible=True,
            trial_days=14
        ),
        SubscriptionPlan(
            name="Enterprise",
            plan_type=PlanType.ENTERPRISE,
            description="Custom solutions for large organizations",
            price_monthly=Decimal("0"),  # Custom pricing
            price_yearly=Decimal("0"),
            currency="KRW",
            max_contracts=None,
            max_analyses_per_month=None,
            max_signatures_per_month=None,
            max_blockchain_anchors=None,
            max_storage_mb=100000,
            max_team_members=None,
            has_ai_analysis=True,
            has_did_signing=True,
            has_blockchain_anchoring=True,
            has_premium_templates=True,
            has_api_access=True,
            has_priority_support=True,
            has_white_label=True,
            is_active=True,
            is_visible=False,  # Hidden, contact sales
            trial_days=30
        )
    ]

    for plan in plans:
        db.add(plan)

    await db.flush()
    print("Subscription plans seeded successfully")


async def seed_system_templates(db: AsyncSession):
    """Seed system contract templates."""
    from app.models.template import ContractTemplate, TemplateCategory, TemplateVisibility

    # Check if templates already exist
    result = await db.execute(
        select(ContractTemplate).where(ContractTemplate.is_system == True)
    )
    existing = result.scalars().all()
    if existing:
        return

    templates = [
        ContractTemplate(
            name="Freelance Service Agreement",
            description="Standard freelance contract for service providers",
            category=TemplateCategory.FREELANCE,
            visibility=TemplateVisibility.PUBLIC,
            is_system=True,
            content="""FREELANCE SERVICE AGREEMENT

This Agreement is entered into as of {{effective_date}} between:

Client: {{client_name}} ("Client")
Address: {{client_address}}

Service Provider: {{provider_name}} ("Provider")
Address: {{provider_address}}

1. SERVICES
Provider agrees to perform the following services: {{service_description}}

2. COMPENSATION
Client agrees to pay Provider {{payment_amount}} for the services described above.
Payment terms: {{payment_terms}}

3. TIMELINE
Project start date: {{start_date}}
Estimated completion: {{end_date}}

4. INTELLECTUAL PROPERTY
{{ip_clause}}

5. CONFIDENTIALITY
Both parties agree to maintain confidentiality of proprietary information.

6. TERMINATION
Either party may terminate this agreement with {{notice_period}} written notice.

Signatures:

Client: ____________________  Date: ________
Provider: __________________  Date: ________
""",
            fields=[
                {"field_key": "effective_date", "field_label": "Effective Date", "field_type": "date", "required": True},
                {"field_key": "client_name", "field_label": "Client Name", "field_type": "text", "required": True},
                {"field_key": "client_address", "field_label": "Client Address", "field_type": "textarea", "required": True},
                {"field_key": "provider_name", "field_label": "Provider Name", "field_type": "text", "required": True},
                {"field_key": "provider_address", "field_label": "Provider Address", "field_type": "textarea", "required": True},
                {"field_key": "service_description", "field_label": "Service Description", "field_type": "textarea", "required": True},
                {"field_key": "payment_amount", "field_label": "Payment Amount", "field_type": "text", "required": True},
                {"field_key": "payment_terms", "field_label": "Payment Terms", "field_type": "text", "required": True},
                {"field_key": "start_date", "field_label": "Start Date", "field_type": "date", "required": True},
                {"field_key": "end_date", "field_label": "End Date", "field_type": "date", "required": True},
                {"field_key": "ip_clause", "field_label": "IP Ownership Clause", "field_type": "textarea", "required": False},
                {"field_key": "notice_period", "field_label": "Notice Period", "field_type": "text", "required": True}
            ],
            language="en"
        ),
        ContractTemplate(
            name="Non-Disclosure Agreement (NDA)",
            description="Mutual or one-way confidentiality agreement",
            category=TemplateCategory.NDA,
            visibility=TemplateVisibility.PUBLIC,
            is_system=True,
            content="""NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is made effective as of {{effective_date}}.

BETWEEN:
Disclosing Party: {{disclosing_party}} ("Discloser")
Receiving Party: {{receiving_party}} ("Recipient")

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means {{confidential_info_definition}}

2. OBLIGATIONS OF RECEIVING PARTY
Recipient agrees to:
- Hold and maintain the Confidential Information in strict confidence
- Not disclose the Confidential Information to third parties without prior written consent
- Use the Confidential Information solely for {{permitted_use}}

3. EXCLUSIONS
This Agreement does not apply to information that:
- Is or becomes publicly available through no fault of Recipient
- Was known to Recipient prior to disclosure
- Is independently developed by Recipient

4. TERM
This Agreement shall remain in effect for {{term_duration}}.

5. RETURN OF MATERIALS
Upon termination, Recipient shall return all materials containing Confidential Information.

6. GOVERNING LAW
This Agreement shall be governed by the laws of {{governing_law}}.

IN WITNESS WHEREOF, the parties have executed this Agreement:

Disclosing Party: ____________________ Date: ________
Receiving Party: ____________________ Date: ________
""",
            fields=[
                {"field_key": "effective_date", "field_label": "Effective Date", "field_type": "date", "required": True},
                {"field_key": "disclosing_party", "field_label": "Disclosing Party", "field_type": "text", "required": True},
                {"field_key": "receiving_party", "field_label": "Receiving Party", "field_type": "text", "required": True},
                {"field_key": "confidential_info_definition", "field_label": "Confidential Information Definition", "field_type": "textarea", "required": True},
                {"field_key": "permitted_use", "field_label": "Permitted Use", "field_type": "textarea", "required": True},
                {"field_key": "term_duration", "field_label": "Term Duration", "field_type": "text", "required": True},
                {"field_key": "governing_law", "field_label": "Governing Law", "field_type": "text", "required": True}
            ],
            language="en"
        )
    ]

    for template in templates:
        db.add(template)

    await db.flush()
    print("System templates seeded successfully")


async def run_seeds(db: AsyncSession):
    """Run all seed functions."""
    await seed_subscription_plans(db)
    await seed_system_templates(db)
    await db.commit()

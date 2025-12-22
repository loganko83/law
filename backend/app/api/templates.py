"""Contract template API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
import re

from app.db.base import get_db
from app.models.user import User
from app.models.template import ContractTemplate, TemplateVersion, TemplateCategory, TemplateVisibility
from app.models.contract import Contract, ContractType
from app.api.auth import get_current_user

router = APIRouter(prefix="/templates", tags=["Contract Templates"])


# ==================== Schemas ====================

class TemplateFieldSchema(BaseModel):
    field_key: str
    field_label: str
    field_type: str = "text"
    required: bool = False
    default_value: Optional[str] = None
    options: Optional[List[str]] = None  # For select type


class CreateTemplateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    category: str = "other"
    content: str
    fields: Optional[List[TemplateFieldSchema]] = None
    visibility: str = "private"


class UpdateTemplateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    fields: Optional[List[TemplateFieldSchema]] = None
    visibility: Optional[str] = None
    change_notes: Optional[str] = None


class TemplateResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    category: str
    visibility: str
    content: Optional[str]
    fields: Optional[List[Dict[str, Any]]]
    is_system: bool
    is_premium: bool
    use_count: int
    rating: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    category: str
    visibility: str
    is_system: bool
    is_premium: bool
    use_count: int
    rating: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


class GenerateFromTemplateRequest(BaseModel):
    template_id: UUID
    title: str
    field_values: Dict[str, str]


class TemplatePreviewRequest(BaseModel):
    template_id: UUID
    field_values: Dict[str, str]


# ==================== Helper Functions ====================

def extract_placeholders(content: str) -> List[str]:
    """Extract placeholder keys from template content."""
    pattern = r'\{\{(\w+)\}\}'
    return list(set(re.findall(pattern, content)))


def fill_template(content: str, values: Dict[str, str]) -> str:
    """Replace placeholders with actual values."""
    result = content
    for key, value in values.items():
        placeholder = f"{{{{{key}}}}}"
        result = result.replace(placeholder, value)
    return result


# ==================== Endpoints ====================

@router.get("/", response_model=List[TemplateListResponse])
async def list_templates(
    category: Optional[str] = None,
    search: Optional[str] = None,
    include_public: bool = True,
    include_system: bool = True,
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List available templates.

    Includes user's private templates, public templates, and system templates.
    """
    query = select(ContractTemplate)

    # Build visibility filter
    visibility_filters = [ContractTemplate.user_id == current_user.id]

    if include_public:
        visibility_filters.append(ContractTemplate.visibility == TemplateVisibility.PUBLIC)

    if include_system:
        visibility_filters.append(ContractTemplate.is_system == True)

    query = query.where(or_(*visibility_filters))

    # Category filter
    if category:
        try:
            cat = TemplateCategory(category)
            query = query.where(ContractTemplate.category == cat)
        except ValueError:
            pass

    # Search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                ContractTemplate.name.ilike(search_pattern),
                ContractTemplate.description.ilike(search_pattern)
            )
        )

    # Pagination and ordering
    query = query.order_by(
        ContractTemplate.is_system.desc(),
        ContractTemplate.use_count.desc(),
        ContractTemplate.created_at.desc()
    ).offset(skip).limit(limit)

    result = await db.execute(query)
    templates = result.scalars().all()

    return [
        TemplateListResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            category=t.category.value,
            visibility=t.visibility.value,
            is_system=t.is_system,
            is_premium=t.is_premium,
            use_count=t.use_count,
            rating=t.rating / t.rating_count if t.rating_count > 0 else None,
            created_at=t.created_at
        )
        for t in templates
    ]


@router.get("/categories")
async def list_categories():
    """Get all available template categories."""
    return [
        {"value": cat.value, "label": cat.value.replace("_", " ").title()}
        for cat in TemplateCategory
    ]


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get template details."""
    result = await db.execute(
        select(ContractTemplate).where(ContractTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Check access
    is_owner = template.user_id == current_user.id
    is_public = template.visibility == TemplateVisibility.PUBLIC
    is_system = template.is_system

    if not (is_owner or is_public or is_system):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this template"
        )

    # Check premium access
    if template.is_premium and current_user.subscription_tier == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This template requires a premium subscription"
        )

    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        category=template.category.value,
        visibility=template.visibility.value,
        content=template.content,
        fields=template.fields,
        is_system=template.is_system,
        is_premium=template.is_premium,
        use_count=template.use_count,
        rating=template.rating / template.rating_count if template.rating_count > 0 else None,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.post("/", response_model=TemplateResponse)
async def create_template(
    request: CreateTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new template."""
    # Validate category
    try:
        category = TemplateCategory(request.category)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {[c.value for c in TemplateCategory]}"
        )

    # Validate visibility
    try:
        visibility = TemplateVisibility(request.visibility)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid visibility. Must be one of: {[v.value for v in TemplateVisibility]}"
        )

    # Auto-extract placeholders if fields not provided
    fields = None
    if request.fields:
        fields = [f.model_dump() for f in request.fields]
    else:
        placeholders = extract_placeholders(request.content)
        if placeholders:
            fields = [
                {
                    "field_key": p,
                    "field_label": p.replace("_", " ").title(),
                    "field_type": "text",
                    "required": False
                }
                for p in placeholders
            ]

    template = ContractTemplate(
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        category=category,
        visibility=visibility,
        content=request.content,
        fields=fields
    )

    db.add(template)
    await db.flush()

    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        category=template.category.value,
        visibility=template.visibility.value,
        content=template.content,
        fields=template.fields,
        is_system=template.is_system,
        is_premium=template.is_premium,
        use_count=template.use_count,
        rating=None,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: UUID,
    request: UpdateTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a template."""
    result = await db.execute(
        select(ContractTemplate).where(ContractTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    if template.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own templates"
        )

    # Create version snapshot before update
    if request.content and request.content != template.content:
        result = await db.execute(
            select(func.max(TemplateVersion.version))
            .where(TemplateVersion.template_id == template_id)
        )
        max_version = result.scalar() or 0

        version = TemplateVersion(
            template_id=template_id,
            version=max_version + 1,
            content=template.content,
            fields=template.fields,
            change_notes=request.change_notes
        )
        db.add(version)

    # Update fields
    if request.name:
        template.name = request.name
    if request.description is not None:
        template.description = request.description
    if request.category:
        try:
            template.category = TemplateCategory(request.category)
        except ValueError:
            pass
    if request.visibility:
        try:
            template.visibility = TemplateVisibility(request.visibility)
        except ValueError:
            pass
    if request.content:
        template.content = request.content
    if request.fields:
        template.fields = [f.model_dump() for f in request.fields]

    await db.flush()

    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        category=template.category.value,
        visibility=template.visibility.value,
        content=template.content,
        fields=template.fields,
        is_system=template.is_system,
        is_premium=template.is_premium,
        use_count=template.use_count,
        rating=template.rating / template.rating_count if template.rating_count > 0 else None,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.delete("/{template_id}")
async def delete_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a template."""
    result = await db.execute(
        select(ContractTemplate).where(ContractTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    if template.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own templates"
        )

    if template.is_system:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete system templates"
        )

    await db.delete(template)
    await db.flush()

    return {"message": "Template deleted successfully"}


@router.post("/preview")
async def preview_template(
    request: TemplatePreviewRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Preview a template with filled values."""
    result = await db.execute(
        select(ContractTemplate).where(ContractTemplate.id == request.template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Fill template
    filled_content = fill_template(template.content, request.field_values)

    # Check for unfilled placeholders
    remaining = extract_placeholders(filled_content)

    return {
        "preview": filled_content,
        "unfilled_fields": remaining,
        "is_complete": len(remaining) == 0
    }


@router.post("/generate", response_model=dict)
async def generate_contract_from_template(
    request: GenerateFromTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate a new contract from a template."""
    result = await db.execute(
        select(ContractTemplate).where(ContractTemplate.id == request.template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Check access and premium
    is_owner = template.user_id == current_user.id
    is_public = template.visibility == TemplateVisibility.PUBLIC
    is_system = template.is_system

    if not (is_owner or is_public or is_system):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this template"
        )

    if template.is_premium and current_user.subscription_tier == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This template requires a premium subscription"
        )

    # Validate required fields
    if template.fields:
        for field in template.fields:
            if field.get("required") and field["field_key"] not in request.field_values:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Required field missing: {field['field_label']}"
                )

    # Generate filled content
    filled_content = fill_template(template.content, request.field_values)

    # Map template category to contract type
    type_mapping = {
        TemplateCategory.FREELANCE: ContractType.FREELANCE,
        TemplateCategory.RENTAL: ContractType.RENTAL,
        TemplateCategory.EMPLOYMENT: ContractType.EMPLOYMENT,
        TemplateCategory.SERVICE: ContractType.SERVICE,
        TemplateCategory.SALES: ContractType.SALES,
        TemplateCategory.BUSINESS: ContractType.BUSINESS,
        TemplateCategory.NDA: ContractType.NDA,
        TemplateCategory.INVESTMENT: ContractType.INVESTMENT,
    }
    contract_type = type_mapping.get(template.category, ContractType.OTHER)

    # Create contract
    contract = Contract(
        user_id=current_user.id,
        title=request.title,
        description=f"Generated from template: {template.name}",
        contract_type=contract_type
    )

    db.add(contract)

    # Increment template usage
    template.use_count += 1

    await db.flush()

    return {
        "contract_id": str(contract.id),
        "title": contract.title,
        "content": filled_content,
        "message": "Contract created successfully"
    }


@router.post("/{template_id}/rate")
async def rate_template(
    template_id: UUID,
    rating: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Rate a template (1-5 stars)."""
    if rating < 1 or rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )

    result = await db.execute(
        select(ContractTemplate).where(ContractTemplate.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Update rating
    template.rating = (template.rating or 0) + rating
    template.rating_count += 1

    await db.flush()

    avg_rating = template.rating / template.rating_count

    return {
        "template_id": str(template_id),
        "new_rating": round(avg_rating, 1),
        "total_ratings": template.rating_count
    }

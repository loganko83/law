"""Contract template models."""
from sqlalchemy import Column, String, DateTime, Enum, Text, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
import enum

from app.db.base import Base


class TemplateCategory(str, enum.Enum):
    FREELANCE = "freelance"
    RENTAL = "rental"
    EMPLOYMENT = "employment"
    SERVICE = "service"
    SALES = "sales"
    BUSINESS = "business"
    NDA = "nda"
    INVESTMENT = "investment"
    PARTNERSHIP = "partnership"
    OTHER = "other"


class TemplateVisibility(str, enum.Enum):
    PRIVATE = "private"
    PUBLIC = "public"
    ORGANIZATION = "organization"


class ContractTemplate(Base):
    """Reusable contract templates."""
    __tablename__ = "contract_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Template info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(Enum(TemplateCategory), default=TemplateCategory.OTHER)
    visibility = Column(Enum(TemplateVisibility), default=TemplateVisibility.PRIVATE)

    # Template content
    content = Column(Text, nullable=True)  # Template text with placeholders
    fields = Column(JSONB, nullable=True)  # Field definitions for placeholders
    sample_data = Column(JSONB, nullable=True)  # Sample values for preview

    # Metadata
    language = Column(String(10), default="ko")  # ko, en
    is_system = Column(Boolean, default=False)  # System-provided templates
    is_premium = Column(Boolean, default=False)  # Premium-only templates

    # Stats
    use_count = Column(Integer, default=0)
    rating = Column(Integer, nullable=True)  # 1-5 stars
    rating_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    versions = relationship("TemplateVersion", back_populates="template", cascade="all, delete-orphan")


class TemplateVersion(Base):
    """Version history for templates."""
    __tablename__ = "template_versions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("contract_templates.id"), nullable=False)

    version = Column(Integer, nullable=False)
    content = Column(Text, nullable=True)
    fields = Column(JSONB, nullable=True)
    change_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    template = relationship("ContractTemplate", back_populates="versions")


class TemplateField(Base):
    """Field definitions for template placeholders."""
    __tablename__ = "template_fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("contract_templates.id"), nullable=False)

    # Field info
    field_key = Column(String(100), nullable=False)  # e.g., {{party_a_name}}
    field_label = Column(String(255), nullable=False)  # Display label
    field_type = Column(String(50), default="text")  # text, date, number, select, textarea
    field_options = Column(JSONB, nullable=True)  # For select type

    # Validation
    required = Column(Boolean, default=False)
    default_value = Column(Text, nullable=True)
    validation_regex = Column(String(255), nullable=True)
    min_length = Column(Integer, nullable=True)
    max_length = Column(Integer, nullable=True)

    # Display order
    order = Column(Integer, default=0)

    created_at = Column(DateTime, default=datetime.utcnow)

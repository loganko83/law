from sqlalchemy import Column, String, DateTime, Enum, Text, Integer, ForeignKey, Boolean, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.db.base import Base


class ContractStatus(str, enum.Enum):
    DRAFT = "draft"
    PENDING_SIGNATURE = "pending_signature"
    SIGNED = "signed"
    ACTIVE = "active"
    COMPLETED = "completed"
    DISPUTE = "dispute"
    CANCELLED = "cancelled"


class ContractType(str, enum.Enum):
    FREELANCE = "freelance"
    RENTAL = "rental"
    EMPLOYMENT = "employment"
    SERVICE = "service"
    SALES = "sales"
    BUSINESS = "business"
    INVESTMENT = "investment"
    NDA = "nda"
    OTHER = "other"


class PartyRole(str, enum.Enum):
    PARTY_A = "party_a"
    PARTY_B = "party_b"
    WITNESS = "witness"


class Contract(Base):
    __tablename__ = "contracts"
    __table_args__ = (
        Index('ix_contracts_user_id', 'user_id'),
        Index('ix_contracts_created_at', 'created_at'),
        Index('ix_contracts_user_status', 'user_id', 'status'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    contract_type = Column(Enum(ContractType), default=ContractType.OTHER)
    status = Column(Enum(ContractStatus), default=ContractStatus.DRAFT)
    safety_score = Column(Integer, nullable=True)

    # Metadata
    description = Column(Text, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    share_url = Column(String(255), nullable=True, unique=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    signed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="contracts")
    documents = relationship("ContractDocument", back_populates="contract", cascade="all, delete-orphan")
    parties = relationship("ContractParty", back_populates="contract", cascade="all, delete-orphan")
    analyses = relationship("AIAnalysis", back_populates="contract", cascade="all, delete-orphan")
    blockchain_records = relationship("BlockchainRecord", back_populates="contract", cascade="all, delete-orphan")


class ContractDocument(Base):
    __tablename__ = "contract_documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)

    # File info
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx, jpg, etc.
    file_size = Column(Integer, nullable=False)  # bytes
    content_hash = Column(String(64), nullable=False)  # SHA-256

    # OCR result
    ocr_text = Column(Text, nullable=True)
    ocr_status = Column(String(20), default="pending")  # pending, processing, completed, failed

    # Version control
    version = Column(Integer, default=1)
    is_latest = Column(Boolean, default=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    contract = relationship("Contract", back_populates="documents")


class ContractParty(Base):
    __tablename__ = "contract_parties"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    role = Column(Enum(PartyRole), nullable=False)
    name = Column(String(100), nullable=True)
    email = Column(String(255), nullable=True)
    phone = Column(String(20), nullable=True)

    # Signature
    signed_at = Column(DateTime, nullable=True)
    signature_data = Column(Text, nullable=True)  # Base64 encoded signature
    signature_type = Column(String(20), nullable=True)  # draw, type, image
    signature_hash = Column(String(64), nullable=True)

    # Invitation
    invite_sent_at = Column(DateTime, nullable=True)
    invite_token = Column(String(100), nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationship
    contract = relationship("Contract", back_populates="parties")

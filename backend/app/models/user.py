from sqlalchemy import Column, String, DateTime, Enum, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
import enum

from app.db.base import Base


class AuthLevel(str, enum.Enum):
    BASIC = "basic"
    VERIFIED = "verified"
    DID = "did"


class SubscriptionTier(str, enum.Enum):
    FREE = "free"
    BASIC = "basic"
    PRO = "pro"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)

    # Auth and subscription
    auth_level = Column(
        Enum(AuthLevel),
        default=AuthLevel.BASIC,
        nullable=False
    )
    subscription_tier = Column(
        Enum(SubscriptionTier),
        default=SubscriptionTier.FREE,
        nullable=False
    )

    # Profile context for RAG
    business_type = Column(String(100), nullable=True)
    business_description = Column(Text, nullable=True)
    legal_concerns = Column(Text, nullable=True)

    # Verification
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    contracts = relationship("Contract", back_populates="user", cascade="all, delete-orphan")
    user_did = relationship("UserDID", back_populates="user", uselist=False)


class DidStatus(str, enum.Enum):
    NONE = "none"
    PENDING = "pending"
    CONFIRMED = "confirmed"
    REVOKED = "revoked"


class UserDID(Base):
    __tablename__ = "user_dids"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    did_address = Column(String(255), nullable=False, unique=True)  # did:sw:org:0x...
    did_document = Column(Text, nullable=True)  # JSON string
    status = Column(Enum(DidStatus), default=DidStatus.PENDING)

    # Blockchain info
    tx_hash = Column(String(66), nullable=True)
    block_number = Column(String(20), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)

    # Relationship
    user = relationship("User", back_populates="user_did")

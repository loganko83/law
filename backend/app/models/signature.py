"""Contract signature models with W3C VC support."""
from sqlalchemy import Column, String, DateTime, Enum, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
import enum

from app.db.base import Base


class SignatureStatus(str, enum.Enum):
    PENDING = "pending"
    SIGNED = "signed"
    VERIFIED = "verified"
    REVOKED = "revoked"


class SignatureType(str, enum.Enum):
    DRAW = "draw"
    TYPE = "type"
    IMAGE = "image"


class ContractSignature(Base):
    """Represents a signature on a contract with W3C VC backing."""
    __tablename__ = "contract_signatures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    party_id = Column(UUID(as_uuid=True), ForeignKey("contract_parties.id"), nullable=True)

    # Signer info
    signer_did = Column(String(255), nullable=False)
    signer_name = Column(String(100), nullable=True)
    signer_email = Column(String(255), nullable=True)

    # Signature data
    signature_type = Column(Enum(SignatureType), nullable=False)
    signature_data = Column(Text, nullable=True)  # Base64 encoded
    signature_hash = Column(String(64), nullable=True)  # SHA-256 of signature

    # Document reference
    document_id = Column(UUID(as_uuid=True), ForeignKey("contract_documents.id"), nullable=True)
    document_hash = Column(String(64), nullable=False)  # SHA-256 of document

    # W3C Verifiable Credential
    credential_id = Column(String(255), nullable=True)
    credential = Column(JSONB, nullable=True)  # Full W3C VC
    credential_proof = Column(Text, nullable=True)  # JWS proof

    # Verification
    status = Column(Enum(SignatureStatus), default=SignatureStatus.PENDING)
    verified = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)

    # Timestamps
    signed_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    contract = relationship("Contract")


class SignatureVerification(Base):
    """Log of signature verification attempts."""
    __tablename__ = "signature_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    signature_id = Column(UUID(as_uuid=True), ForeignKey("contract_signatures.id"), nullable=False)

    # Verification result
    verified = Column(Boolean, nullable=False)
    verification_method = Column(String(50), nullable=True)  # did_baas, local
    error_message = Column(Text, nullable=True)

    # Requester info
    requester_ip = Column(String(45), nullable=True)
    requester_did = Column(String(255), nullable=True)

    # Timestamp
    verified_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    signature = relationship("ContractSignature")

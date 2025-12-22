from sqlalchemy import Column, String, DateTime, Enum, Text, Integer, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime
import uuid
import enum

from app.db.base import Base


class AnchorStatus(str, enum.Enum):
    PENDING = "pending"
    QUEUED = "queued"
    PROCESSING = "processing"
    CONFIRMED = "confirmed"
    FAILED = "failed"


class BlockchainRecord(Base):
    __tablename__ = "blockchain_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    contract_id = Column(UUID(as_uuid=True), ForeignKey("contracts.id"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("contract_documents.id"), nullable=True)

    # Hash info
    document_hash = Column(String(64), nullable=False)  # SHA-256
    salt = Column(String(64), nullable=True)  # Random salt for privacy

    # Merkle tree
    merkle_root = Column(String(64), nullable=True)
    merkle_proof = Column(JSONB, nullable=True)  # Array of hashes
    batch_id = Column(String(50), nullable=True)

    # Blockchain transaction
    tx_hash = Column(String(66), nullable=True)  # 0x...
    block_number = Column(BigInteger, nullable=True)
    network = Column(String(50), default="xphere")

    # Status
    status = Column(Enum(AnchorStatus), default=AnchorStatus.PENDING)
    error_message = Column(Text, nullable=True)

    # Gas
    gas_used = Column(Integer, nullable=True)
    gas_price_gwei = Column(Integer, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    queued_at = Column(DateTime, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)

    # Relationship
    contract = relationship("Contract", back_populates="blockchain_records")
    certificate = relationship("Certificate", back_populates="blockchain_record", uselist=False)


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    blockchain_record_id = Column(
        UUID(as_uuid=True),
        ForeignKey("blockchain_records.id"),
        nullable=False,
        unique=True
    )

    # Certificate info
    certificate_number = Column(String(50), unique=True, nullable=False)  # SC-2024-000123
    pdf_url = Column(String(500), nullable=True)
    qr_code_url = Column(String(500), nullable=True)

    # Verification
    verification_url = Column(String(500), nullable=True)
    verification_count = Column(Integer, default=0)
    last_verified_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    blockchain_record = relationship("BlockchainRecord", back_populates="certificate")

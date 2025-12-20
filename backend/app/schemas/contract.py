from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class ContractStatusEnum(str, Enum):
    DRAFT = "draft"
    PENDING_SIGNATURE = "pending_signature"
    SIGNED = "signed"
    ACTIVE = "active"
    COMPLETED = "completed"
    DISPUTE = "dispute"
    CANCELLED = "cancelled"


class ContractTypeEnum(str, Enum):
    FREELANCE = "freelance"
    RENTAL = "rental"
    EMPLOYMENT = "employment"
    SERVICE = "service"
    SALES = "sales"
    BUSINESS = "business"
    INVESTMENT = "investment"
    NDA = "nda"
    OTHER = "other"


class PartyRoleEnum(str, Enum):
    PARTY_A = "party_a"
    PARTY_B = "party_b"
    WITNESS = "witness"


# Party schemas
class PartyCreate(BaseModel):
    role: PartyRoleEnum
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class PartyResponse(BaseModel):
    id: UUID
    role: PartyRoleEnum
    name: Optional[str] = None
    email: Optional[str] = None
    signed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Document schemas
class DocumentResponse(BaseModel):
    id: UUID
    file_name: str
    file_type: str
    file_size: int
    content_hash: str
    ocr_status: str
    version: int
    created_at: datetime

    class Config:
        from_attributes = True


# Contract schemas
class ContractCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    contract_type: ContractTypeEnum = ContractTypeEnum.OTHER
    description: Optional[str] = None
    expires_at: Optional[datetime] = None
    parties: Optional[List[PartyCreate]] = None


class ContractUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    contract_type: Optional[ContractTypeEnum] = None
    description: Optional[str] = None
    status: Optional[ContractStatusEnum] = None
    expires_at: Optional[datetime] = None


class ContractResponse(BaseModel):
    id: UUID
    title: str
    contract_type: ContractTypeEnum
    status: ContractStatusEnum
    safety_score: Optional[int] = None
    description: Optional[str] = None
    expires_at: Optional[datetime] = None
    share_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    signed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ContractDetailResponse(ContractResponse):
    documents: List[DocumentResponse] = []
    parties: List[PartyResponse] = []

    class Config:
        from_attributes = True


class ContractListResponse(BaseModel):
    contracts: List[ContractResponse]
    total: int
    page: int
    page_size: int

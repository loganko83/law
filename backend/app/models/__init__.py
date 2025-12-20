# Import all models for Alembic autodiscovery
from app.models.user import User, UserDID, AuthLevel, SubscriptionTier
from app.models.contract import (
    Contract,
    ContractDocument,
    ContractParty,
    ContractStatus,
    ContractType,
    PartyRole
)
from app.models.analysis import (
    AIAnalysis,
    AnalysisClause,
    AnalysisQuestion,
    StandardClause,
    AnalysisStatus,
    RiskLevel
)
from app.models.blockchain import (
    BlockchainRecord,
    Certificate,
    AnchorStatus
)

__all__ = [
    # User
    "User",
    "UserDID",
    "AuthLevel",
    "SubscriptionTier",
    # Contract
    "Contract",
    "ContractDocument",
    "ContractParty",
    "ContractStatus",
    "ContractType",
    "PartyRole",
    # Analysis
    "AIAnalysis",
    "AnalysisClause",
    "AnalysisQuestion",
    "StandardClause",
    "AnalysisStatus",
    "RiskLevel",
    # Blockchain
    "BlockchainRecord",
    "Certificate",
    "AnchorStatus",
]

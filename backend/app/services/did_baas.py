"""DID BaaS Client for Xphere blockchain integration."""
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
import uuid
import hashlib

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("did_baas")


# Mock mode flag - enabled when API key is not configured
MOCK_MODE = not settings.DID_BAAS_API_KEY or settings.DID_BAAS_API_KEY.strip() == ""


class DidBaasError(Exception):
    """Custom exception for DID BaaS errors."""

    def __init__(self, message: str, status_code: int = 500, details: Dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class MockDidBaasClient:
    """Mock DID BaaS client for development/testing without real API key."""

    def __init__(self):
        self._mock_dids: Dict[str, Dict] = {}
        self._mock_credentials: Dict[str, Dict] = {}
        logger.warning("DID BaaS running in MOCK MODE - no real blockchain operations")

    async def close(self):
        """No-op for mock client."""
        pass

    async def health_check(self) -> Dict[str, Any]:
        """Mock health check."""
        return {
            "status": "healthy",
            "mode": "mock",
            "message": "DID BaaS is running in mock mode",
            "api_key_configured": False
        }

    def is_available(self) -> bool:
        """Check if service is available."""
        return True  # Mock is always available

    def _generate_mock_did(self) -> str:
        """Generate a mock DID address."""
        random_hex = hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()[:40]
        return f"did:sw:test:0x{random_hex}"

    async def issue_did(self, civil_id: str) -> Dict[str, Any]:
        """Mock DID issuance."""
        did_address = self._generate_mock_did()
        mock_tx_hash = f"0x{hashlib.sha256(did_address.encode()).hexdigest()}"

        self._mock_dids[did_address] = {
            "didAddress": did_address,
            "civilId": civil_id,
            "status": "CONFIRMED",
            "transactionHash": mock_tx_hash,
            "issuedAt": datetime.utcnow().isoformat() + "Z"
        }

        logger.info(f"[MOCK] Issued DID: {did_address}")
        return {
            "didAddress": did_address,
            "civilId": civil_id,
            "status": "CONFIRMED",
            "transactionHash": mock_tx_hash
        }

    async def get_did(self, did_address: str) -> Dict[str, Any]:
        """Mock get DID."""
        if did_address in self._mock_dids:
            return self._mock_dids[did_address]
        # Return mock data for any DID
        return {
            "didAddress": did_address,
            "status": "CONFIRMED",
            "txHash": f"0x{hashlib.sha256(did_address.encode()).hexdigest()}"
        }

    async def verify_did(self, did_address: str) -> Dict[str, Any]:
        """Mock DID verification."""
        logger.info(f"[MOCK] Verifying DID: {did_address}")
        return {
            "valid": True,
            "onChainStatus": {
                "isValid": True,
                "issuedAt": datetime.utcnow().isoformat() + "Z"
            }
        }

    async def get_did_document(self, did_address: str) -> Dict[str, Any]:
        """Mock get DID Document."""
        return {
            "@context": [
                "https://www.w3.org/ns/did/v1",
                "https://w3id.org/security/suites/jws-2020/v1"
            ],
            "id": did_address,
            "verificationMethod": [{
                "id": f"{did_address}#key-1",
                "type": "JsonWebKey2020",
                "controller": did_address,
                "publicKeyJwk": {
                    "kty": "EC",
                    "crv": "secp256k1",
                    "x": "mock_x_value",
                    "y": "mock_y_value"
                }
            }],
            "authentication": [f"{did_address}#key-1"],
            "assertionMethod": [f"{did_address}#key-1"]
        }

    async def revoke_did(self, did_address: str, reason: str = None) -> Dict[str, Any]:
        """Mock DID revocation."""
        logger.info(f"[MOCK] Revoking DID: {did_address}, reason: {reason}")
        if did_address in self._mock_dids:
            self._mock_dids[did_address]["status"] = "REVOKED"
        return {"success": True, "message": "DID revoked (mock)"}

    async def issue_w3c_credential(
        self,
        issuer_did: str,
        subject_did: str,
        schema_id: str,
        claims: Dict[str, Any],
        expires_at: str = None
    ) -> Dict[str, Any]:
        """Mock W3C credential issuance."""
        credential_id = f"urn:uuid:{uuid.uuid4()}"

        credential = {
            "@context": [
                "https://www.w3.org/2018/credentials/v1",
                "https://schema.org/"
            ],
            "id": credential_id,
            "type": ["VerifiableCredential", schema_id],
            "issuer": issuer_did,
            "issuanceDate": datetime.utcnow().isoformat() + "Z",
            "credentialSubject": {
                "id": subject_did,
                **claims
            },
            "proof": {
                "type": "JwtProof2020",
                "created": datetime.utcnow().isoformat() + "Z",
                "jws": f"mock_jws_{hashlib.sha256(credential_id.encode()).hexdigest()[:32]}"
            }
        }

        if expires_at:
            credential["expirationDate"] = expires_at

        self._mock_credentials[credential_id] = credential
        logger.info(f"[MOCK] Issued credential: {credential_id}")
        return credential

    async def verify_w3c_credential(self, credential: Dict) -> Dict[str, Any]:
        """Mock credential verification."""
        return {
            "valid": True,
            "errors": [],
            "warnings": []
        }

    async def get_credential(self, credential_id: str) -> Dict[str, Any]:
        """Mock get credential."""
        if credential_id in self._mock_credentials:
            return self._mock_credentials[credential_id]
        raise DidBaasError("Credential not found", status_code=404)

    async def revoke_credential(self, credential_id: str, reason: str = None) -> Dict[str, Any]:
        """Mock credential revocation."""
        logger.info(f"[MOCK] Revoking credential: {credential_id}")
        return {"success": True, "message": "Credential revoked (mock)"}

    async def list_schemas(self) -> List[Dict[str, Any]]:
        """Mock list schemas."""
        return [
            {"id": "contract-signature-v1", "name": "Contract Signature", "version": "1.0"},
            {"id": "identity-v1", "name": "Identity", "version": "1.0"}
        ]

    async def get_schema(self, schema_id: str) -> Dict[str, Any]:
        """Mock get schema."""
        return {
            "id": schema_id,
            "name": schema_id.replace("-", " ").title(),
            "version": "1.0",
            "attributes": ["contractId", "contractHash", "signedAt"]
        }

    async def issue_signature_credential(
        self,
        signer_did: str,
        contract_id: str,
        contract_hash: str,
        signature_type: str = "draw",
        signature_data: str = None
    ) -> Dict[str, Any]:
        """Mock signature credential issuance."""
        claims = {
            "contractId": contract_id,
            "contractHash": contract_hash,
            "signedAt": datetime.utcnow().isoformat() + "Z",
            "signatureType": signature_type
        }

        if signature_data:
            claims["signatureHash"] = hashlib.sha256(signature_data.encode()).hexdigest()

        mock_issuer = settings.SAFECON_ISSUER_DID or "did:sw:safecon:mock-issuer"

        return await self.issue_w3c_credential(
            issuer_did=mock_issuer,
            subject_did=signer_did,
            schema_id="contract-signature-v1",
            claims=claims
        )

    async def verify_signature_credential(self, credential: Dict) -> Dict[str, Any]:
        """Mock signature credential verification."""
        return await self.verify_w3c_credential(credential)


class DidBaasClient:
    """Client for interacting with DID BaaS API."""

    def __init__(
        self,
        base_url: str = None,
        api_key: str = None,
        timeout: int = 30
    ):
        self.base_url = base_url or settings.DID_BAAS_URL
        self.api_key = api_key or settings.DID_BAAS_API_KEY
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "X-API-Key": self.api_key,
                    "Content-Type": "application/json"
                },
                timeout=self.timeout
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def _request(
        self,
        method: str,
        endpoint: str,
        json: Dict = None,
        params: Dict = None
    ) -> Dict[str, Any]:
        """Make HTTP request to DID BaaS API."""
        client = await self._get_client()

        try:
            response = await client.request(
                method=method,
                url=endpoint,
                json=json,
                params=params
            )

            if response.status_code >= 400:
                error_detail = response.json() if response.content else {}
                raise DidBaasError(
                    message=error_detail.get("message", f"Request failed with status {response.status_code}"),
                    status_code=response.status_code,
                    details=error_detail
                )

            return response.json() if response.content else {}

        except httpx.RequestError as e:
            logger.error(f"DID BaaS request error: {e}")
            raise DidBaasError(
                message=f"Connection error: {str(e)}",
                status_code=503
            )

    # ==================== DID Operations ====================

    async def issue_did(self, civil_id: str) -> Dict[str, Any]:
        """
        Issue a new DID.

        Args:
            civil_id: Unique identifier for the user (e.g., user ID)

        Returns:
            {
                "didAddress": "did:sw:org123:0x1234...",
                "status": "PENDING",
                "transactionHash": "0x...",
                ...
            }
        """
        result = await self._request(
            "POST",
            "/did/issue",
            json={"civilId": civil_id}
        )
        # Extract data from wrapped response
        if "data" in result:
            return result["data"]
        return result

    async def get_did(self, did_address: str) -> Dict[str, Any]:
        """Get DID details."""
        return await self._request("GET", f"/did/{did_address}")

    async def verify_did(self, did_address: str) -> Dict[str, Any]:
        """
        Verify a DID on blockchain.

        Returns:
            {
                "valid": true,
                "onChainStatus": {
                    "isValid": true,
                    "issuedAt": "2024-01-15T10:00:00Z"
                }
            }
        """
        return await self._request("GET", f"/did/{did_address}/verify")

    async def get_did_document(self, did_address: str) -> Dict[str, Any]:
        """Get W3C DID Document."""
        return await self._request("GET", f"/did/{did_address}/document")

    async def revoke_did(self, did_address: str, reason: str = None) -> Dict[str, Any]:
        """Revoke a DID."""
        return await self._request(
            "POST",
            f"/did/{did_address}/revoke",
            json={"reason": reason}
        )

    # ==================== Credential Operations ====================

    async def issue_w3c_credential(
        self,
        issuer_did: str,
        subject_did: str,
        schema_id: str,
        claims: Dict[str, Any],
        expires_at: str = None
    ) -> Dict[str, Any]:
        """
        Issue a W3C Verifiable Credential.

        Returns:
            {
                "@context": ["https://www.w3.org/2018/credentials/v1"],
                "type": ["VerifiableCredential", ...],
                "issuer": "did:sw:...",
                "credentialSubject": {...},
                "proof": {
                    "type": "JwtProof2020",
                    "jws": "eyJ..."
                }
            }
        """
        payload = {
            "issuerDid": issuer_did,
            "subjectDid": subject_did,
            "schemaId": schema_id,
            "claims": claims
        }
        if expires_at:
            payload["expiresAt"] = expires_at

        return await self._request("POST", "/credentials/w3c", json=payload)

    async def verify_w3c_credential(self, credential: Dict) -> Dict[str, Any]:
        """
        Verify a W3C Verifiable Credential.

        Returns:
            {
                "valid": true,
                "errors": [],
                "warnings": []
            }
        """
        return await self._request(
            "POST",
            "/credentials/w3c/verify",
            json={"credential": credential}
        )

    async def get_credential(self, credential_id: str) -> Dict[str, Any]:
        """Get credential by ID."""
        return await self._request("GET", f"/credentials/{credential_id}")

    async def revoke_credential(self, credential_id: str, reason: str = None) -> Dict[str, Any]:
        """Revoke a credential."""
        return await self._request(
            "POST",
            f"/credentials/{credential_id}/revoke",
            json={"reason": reason}
        )

    # ==================== Schema Operations ====================

    async def list_schemas(self) -> List[Dict[str, Any]]:
        """List available credential schemas."""
        return await self._request("GET", "/schemas")

    async def get_schema(self, schema_id: str) -> Dict[str, Any]:
        """Get schema details."""
        return await self._request("GET", f"/schemas/{schema_id}")

    # ==================== Contract Signature Credential ====================

    async def issue_signature_credential(
        self,
        signer_did: str,
        contract_id: str,
        contract_hash: str,
        signature_type: str = "draw",
        signature_data: str = None
    ) -> Dict[str, Any]:
        """
        Issue a contract signature credential.

        This creates a W3C VC that proves a user signed a contract.
        The credential is automatically anchored on Xphere blockchain.
        """
        claims = {
            "contractId": contract_id,
            "contractHash": contract_hash,
            "signedAt": datetime.utcnow().isoformat() + "Z",
            "signatureType": signature_type
        }

        if signature_data:
            # Store hash of signature data, not the actual signature
            import hashlib
            claims["signatureHash"] = hashlib.sha256(signature_data.encode()).hexdigest()

        issuer_did = settings.SAFECON_ISSUER_DID
        if not issuer_did:
            raise DidBaasError(
                message="SafeCon issuer DID not configured",
                status_code=500
            )

        return await self.issue_w3c_credential(
            issuer_did=issuer_did,
            subject_did=signer_did,
            schema_id="contract-signature-v1",
            claims=claims
        )

    async def verify_signature_credential(self, credential: Dict) -> Dict[str, Any]:
        """Verify a contract signature credential."""
        return await self.verify_w3c_credential(credential)

    async def health_check(self) -> Dict[str, Any]:
        """
        Check DID BaaS service health.

        Returns:
            {
                "status": "healthy" | "degraded" | "unhealthy",
                "mode": "live",
                "api_key_configured": True,
                "connection_ok": True | False,
                "error": null | "error message"
            }
        """
        result = {
            "status": "healthy",
            "mode": "live",
            "api_key_configured": bool(self.api_key),
            "connection_ok": False,
            "error": None
        }

        try:
            # Try to list schemas as a simple connectivity test
            await self._request("GET", "/schemas")
            result["connection_ok"] = True
        except DidBaasError as e:
            if e.status_code == 401:
                result["status"] = "unhealthy"
                result["error"] = "API key is invalid or expired"
            elif e.status_code == 403:
                result["status"] = "unhealthy"
                result["error"] = "API key does not have required permissions"
            else:
                result["status"] = "degraded"
                result["error"] = e.message
        except Exception as e:
            result["status"] = "degraded"
            result["error"] = str(e)

        return result

    def is_available(self) -> bool:
        """Check if service is configured and likely available."""
        return bool(self.api_key) and bool(self.base_url)


# Singleton instance - use mock if no API key configured
if MOCK_MODE:
    did_baas_client = MockDidBaasClient()
else:
    did_baas_client = DidBaasClient()


async def get_did_baas_client():
    """Dependency for getting DID BaaS client (real or mock)."""
    return did_baas_client


def is_mock_mode() -> bool:
    """Check if running in mock mode."""
    return MOCK_MODE

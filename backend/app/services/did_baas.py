"""DID BaaS Client for Xphere blockchain integration."""
import httpx
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


class DidBaasError(Exception):
    """Custom exception for DID BaaS errors."""

    def __init__(self, message: str, status_code: int = 500, details: Dict = None):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


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
                    "Authorization": f"Bearer {self.api_key}",
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

    async def issue_did(self, metadata: Dict = None) -> Dict[str, Any]:
        """
        Issue a new DID.

        Returns:
            {
                "didAddress": "did:sw:org123:0x1234...",
                "status": "PENDING",
                "txHash": null,
                ...
            }
        """
        return await self._request(
            "POST",
            "/did",
            json={"metadata": metadata or {}}
        )

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


# Singleton instance
did_baas_client = DidBaasClient()


async def get_did_baas_client() -> DidBaasClient:
    """Dependency for getting DID BaaS client."""
    return did_baas_client

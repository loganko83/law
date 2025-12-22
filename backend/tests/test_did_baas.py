"""Tests for DID BaaS service (mock mode)."""
import pytest
from app.services.did_baas import MockDidBaasClient, DidBaasError


class TestMockDidBaasClient:
    """Tests for MockDidBaasClient."""

    @pytest.fixture
    def mock_client(self):
        """Create mock DID BaaS client."""
        return MockDidBaasClient()

    @pytest.mark.asyncio
    async def test_issue_did_success(self, mock_client):
        """Test DID issuance returns valid DID address."""
        result = await mock_client.issue_did(metadata={"type": "user"})

        assert "didAddress" in result
        assert result["didAddress"].startswith("did:sw:test:0x")
        assert result["status"] == "CONFIRMED"
        assert "txHash" in result

    @pytest.mark.asyncio
    async def test_issue_did_unique_addresses(self, mock_client):
        """Test each DID issuance creates unique address."""
        did1 = await mock_client.issue_did()
        did2 = await mock_client.issue_did()

        assert did1["didAddress"] != did2["didAddress"]
        assert did1["txHash"] != did2["txHash"]

    @pytest.mark.asyncio
    async def test_get_did_success(self, mock_client):
        """Test getting DID details."""
        # First issue a DID
        issued = await mock_client.issue_did()
        did_address = issued["didAddress"]

        # Then retrieve it
        result = await mock_client.get_did(did_address)

        assert result["didAddress"] == did_address
        assert result["status"] == "CONFIRMED"

    @pytest.mark.asyncio
    async def test_verify_did_success(self, mock_client):
        """Test DID verification."""
        issued = await mock_client.issue_did()

        result = await mock_client.verify_did(issued["didAddress"])

        assert result["valid"] is True
        assert result["onChainStatus"]["isValid"] is True

    @pytest.mark.asyncio
    async def test_get_did_document(self, mock_client):
        """Test getting DID Document."""
        issued = await mock_client.issue_did()

        doc = await mock_client.get_did_document(issued["didAddress"])

        assert "@context" in doc
        assert doc["id"] == issued["didAddress"]
        assert "verificationMethod" in doc
        assert "authentication" in doc

    @pytest.mark.asyncio
    async def test_revoke_did_success(self, mock_client):
        """Test DID revocation."""
        issued = await mock_client.issue_did()

        result = await mock_client.revoke_did(issued["didAddress"], reason="test")

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_issue_w3c_credential(self, mock_client):
        """Test W3C credential issuance."""
        result = await mock_client.issue_w3c_credential(
            issuer_did="did:sw:issuer:123",
            subject_did="did:sw:subject:456",
            schema_id="test-schema-v1",
            claims={"name": "Test", "value": 42},
        )

        assert "@context" in result
        assert "https://www.w3.org/2018/credentials/v1" in result["@context"]
        assert result["issuer"] == "did:sw:issuer:123"
        assert result["credentialSubject"]["id"] == "did:sw:subject:456"
        assert result["credentialSubject"]["name"] == "Test"
        assert "proof" in result

    @pytest.mark.asyncio
    async def test_verify_w3c_credential(self, mock_client):
        """Test W3C credential verification."""
        credential = await mock_client.issue_w3c_credential(
            issuer_did="did:sw:issuer:123",
            subject_did="did:sw:subject:456",
            schema_id="test-schema-v1",
            claims={"name": "Test"},
        )

        result = await mock_client.verify_w3c_credential(credential)

        assert result["valid"] is True
        assert result["errors"] == []

    @pytest.mark.asyncio
    async def test_issue_signature_credential(self, mock_client):
        """Test signature credential issuance."""
        result = await mock_client.issue_signature_credential(
            signer_did="did:sw:signer:789",
            contract_id="contract-123",
            contract_hash="abc123hash",
            signature_type="draw",
            signature_data="base64data",
        )

        assert "type" in result
        assert "contract-signature-v1" in result["type"]
        assert result["credentialSubject"]["contractId"] == "contract-123"
        assert result["credentialSubject"]["contractHash"] == "abc123hash"
        assert "signatureHash" in result["credentialSubject"]

    @pytest.mark.asyncio
    async def test_list_schemas(self, mock_client):
        """Test listing credential schemas."""
        schemas = await mock_client.list_schemas()

        assert len(schemas) >= 1
        assert any(s["id"] == "contract-signature-v1" for s in schemas)

    @pytest.mark.asyncio
    async def test_get_schema(self, mock_client):
        """Test getting schema details."""
        schema = await mock_client.get_schema("contract-signature-v1")

        assert schema["id"] == "contract-signature-v1"
        assert "attributes" in schema

    @pytest.mark.asyncio
    async def test_revoke_credential(self, mock_client):
        """Test credential revocation."""
        credential = await mock_client.issue_w3c_credential(
            issuer_did="did:sw:issuer:123",
            subject_did="did:sw:subject:456",
            schema_id="test-schema-v1",
            claims={"name": "Test"},
        )

        result = await mock_client.revoke_credential(credential["id"])

        assert result["success"] is True

    @pytest.mark.asyncio
    async def test_get_nonexistent_credential(self, mock_client):
        """Test getting non-existent credential raises error."""
        with pytest.raises(DidBaasError) as exc_info:
            await mock_client.get_credential("nonexistent-credential-id")

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_close_client(self, mock_client):
        """Test closing the client (no-op for mock)."""
        await mock_client.close()
        # Should not raise any errors

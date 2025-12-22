"""Tests for contract endpoints."""
import pytest
from httpx import AsyncClient


class TestContractCreate:
    """Tests for POST /contracts endpoint."""

    @pytest.mark.asyncio
    async def test_create_contract_success(self, client: AsyncClient, auth_headers):
        """Test successful contract creation."""
        response = await client.post(
            "/contracts",
            headers=auth_headers,
            json={
                "title": "New Contract",
                "description": "Test contract description",
                "contract_type": "nda",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Contract"
        assert data["contract_type"] == "nda"
        assert data["status"] == "draft"
        assert "id" in data

    @pytest.mark.asyncio
    async def test_create_contract_minimal(self, client: AsyncClient, auth_headers):
        """Test contract creation with minimal data."""
        response = await client.post(
            "/contracts",
            headers=auth_headers,
            json={"title": "Minimal Contract"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Minimal Contract"
        assert data["contract_type"] == "other"

    @pytest.mark.asyncio
    async def test_create_contract_unauthenticated(self, client: AsyncClient):
        """Test contract creation without authentication."""
        response = await client.post(
            "/contracts",
            json={"title": "Test"},
        )
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_contract_invalid_type(self, client: AsyncClient, auth_headers):
        """Test contract creation with invalid type."""
        response = await client.post(
            "/contracts",
            headers=auth_headers,
            json={
                "title": "Test Contract",
                "contract_type": "invalid_type",
            },
        )
        assert response.status_code == 422


class TestContractList:
    """Tests for GET /contracts endpoint."""

    @pytest.mark.asyncio
    async def test_list_contracts_empty(self, client: AsyncClient, auth_headers):
        """Test listing contracts when none exist."""
        response = await client.get("/contracts", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []

    @pytest.mark.asyncio
    async def test_list_contracts_with_data(
        self, client: AsyncClient, auth_headers, test_contract
    ):
        """Test listing contracts when contracts exist."""
        response = await client.get("/contracts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == str(test_contract.id)

    @pytest.mark.asyncio
    async def test_list_contracts_pagination(self, client: AsyncClient, auth_headers):
        """Test contract listing with pagination."""
        # Create multiple contracts
        for i in range(5):
            await client.post(
                "/contracts",
                headers=auth_headers,
                json={"title": f"Contract {i}"},
            )

        # Test pagination
        response = await client.get(
            "/contracts",
            headers=auth_headers,
            params={"skip": 0, "limit": 2},
        )
        assert response.status_code == 200
        assert len(response.json()) == 2

        response = await client.get(
            "/contracts",
            headers=auth_headers,
            params={"skip": 2, "limit": 2},
        )
        assert response.status_code == 200
        assert len(response.json()) == 2

    @pytest.mark.asyncio
    async def test_list_contracts_filter_status(
        self, client: AsyncClient, auth_headers, test_contract
    ):
        """Test filtering contracts by status."""
        response = await client.get(
            "/contracts",
            headers=auth_headers,
            params={"status": "draft"},
        )
        assert response.status_code == 200
        data = response.json()
        assert all(c["status"] == "draft" for c in data)

    @pytest.mark.asyncio
    async def test_list_contracts_filter_type(
        self, client: AsyncClient, auth_headers, test_contract
    ):
        """Test filtering contracts by type."""
        response = await client.get(
            "/contracts",
            headers=auth_headers,
            params={"contract_type": "nda"},
        )
        assert response.status_code == 200
        data = response.json()
        assert all(c["contract_type"] == "nda" for c in data)


class TestContractGet:
    """Tests for GET /contracts/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_get_contract_success(
        self, client: AsyncClient, auth_headers, test_contract
    ):
        """Test getting a specific contract."""
        response = await client.get(
            f"/contracts/{test_contract.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_contract.id)
        assert data["title"] == test_contract.title

    @pytest.mark.asyncio
    async def test_get_contract_not_found(self, client: AsyncClient, auth_headers):
        """Test getting a non-existent contract."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(
            f"/contracts/{fake_id}",
            headers=auth_headers,
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_contract_other_user(
        self, client: AsyncClient, test_contract, async_session
    ):
        """Test getting another user's contract."""
        # Create another user and get their token
        from app.models.user import User
        from app.core.security import get_password_hash, create_access_token

        other_user = User(
            email="other@example.com",
            password_hash=get_password_hash("password"),
            name="Other User",
        )
        async_session.add(other_user)
        await async_session.commit()
        await async_session.refresh(other_user)

        other_token = create_access_token({
            "sub": str(other_user.id),
            "email": other_user.email,
            "auth_level": other_user.auth_level.value,
            "tier": other_user.subscription_tier.value,
        })

        response = await client.get(
            f"/contracts/{test_contract.id}",
            headers={"Authorization": f"Bearer {other_token}"},
        )
        assert response.status_code == 404


class TestContractUpdate:
    """Tests for PATCH /contracts/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_update_contract_success(
        self, client: AsyncClient, auth_headers, test_contract
    ):
        """Test successful contract update."""
        response = await client.patch(
            f"/contracts/{test_contract.id}",
            headers=auth_headers,
            json={"title": "Updated Title"},
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Updated Title"

    @pytest.mark.asyncio
    async def test_update_contract_multiple_fields(
        self, client: AsyncClient, auth_headers, test_contract
    ):
        """Test updating multiple fields."""
        response = await client.patch(
            f"/contracts/{test_contract.id}",
            headers=auth_headers,
            json={
                "title": "New Title",
                "description": "New description",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "New Title"
        assert data["description"] == "New description"

    @pytest.mark.asyncio
    async def test_update_contract_not_found(self, client: AsyncClient, auth_headers):
        """Test updating non-existent contract."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.patch(
            f"/contracts/{fake_id}",
            headers=auth_headers,
            json={"title": "New Title"},
        )
        assert response.status_code == 404


class TestContractDelete:
    """Tests for DELETE /contracts/{id} endpoint."""

    @pytest.mark.asyncio
    async def test_delete_contract_success(
        self, client: AsyncClient, auth_headers, test_contract
    ):
        """Test successful contract deletion."""
        response = await client.delete(
            f"/contracts/{test_contract.id}",
            headers=auth_headers,
        )
        assert response.status_code == 200

        # Verify contract is deleted
        get_response = await client.get(
            f"/contracts/{test_contract.id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_contract_not_found(self, client: AsyncClient, auth_headers):
        """Test deleting non-existent contract."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(
            f"/contracts/{fake_id}",
            headers=auth_headers,
        )
        assert response.status_code == 404

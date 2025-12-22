/**
 * SafeCon Backend API Client
 *
 * Provides centralized access to the FastAPI backend
 * for authentication, contracts, DID, signatures, and blockchain operations.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://trendy.storydot.kr/law/api";

// Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  auth_level: "basic" | "verified" | "did";
  subscription_tier: "free" | "basic" | "pro";
  email_verified: boolean;
  created_at: string;
}

export interface UserDID {
  did_address: string;
  status: "none" | "pending" | "confirmed" | "revoked";
  tx_hash: string | null;
  confirmed_at: string | null;
}

export interface Contract {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "pending" | "active" | "expired" | "terminated";
  contract_type: string | null;
  total_value: number | null;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractSignature {
  id: string;
  contract_id: string;
  signer_did: string;
  signer_name: string | null;
  signature_type: "draw" | "type" | "image";
  status: "pending" | "signed" | "verified" | "revoked";
  credential_id: string | null;
  credential?: Record<string, unknown>;
  document_hash: string;
  signed_at: string;
}

export interface BlockchainAnchor {
  id: string;
  contract_id: string;
  document_hash: string;
  status: "pending" | "queued" | "processing" | "confirmed" | "failed";
  tx_hash: string | null;
  block_number: number | null;
  network: string;
  created_at: string;
  confirmed_at: string | null;
}

export interface Certificate {
  id: string;
  certificate_number: string;
  contract_id: string;
  document_hash: string;
  tx_hash: string;
  block_number: number;
  network: string;
  pdf_url: string | null;
  qr_code_url: string | null;
  verification_url: string;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Token storage
const TOKEN_KEY = "safecon_access_token";
const REFRESH_TOKEN_KEY = "safecon_refresh_token";

export const getAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setTokens = (tokens: AuthTokens): void => {
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
};

export const clearTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// API Error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Base request function
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  authenticated = true
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (authenticated) {
    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || `Request failed with status ${response.status}`,
      response.status,
      errorData
    );
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : ({} as T);
}

// ==================== Auth API ====================

export const authApi = {
  async register(email: string, password: string, name?: string): Promise<User> {
    return request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }, false);
  },

  async login(email: string, password: string): Promise<AuthTokens> {
    const tokens = await request<AuthTokens>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, false);
    setTokens(tokens);
    return tokens;
  },

  async logout(): Promise<void> {
    clearTokens();
  },

  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      throw new ApiError("No refresh token available", 401);
    }

    const tokens = await request<AuthTokens>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }, false);
    setTokens(tokens);
    return tokens;
  },

  async getCurrentUser(): Promise<User> {
    return request<User>("/auth/me");
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return request<User>("/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

// ==================== Contracts API ====================

export const contractsApi = {
  async list(params?: {
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<Contract[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.skip) searchParams.set("skip", String(params.skip));
    if (params?.limit) searchParams.set("limit", String(params.limit));

    const query = searchParams.toString();
    return request<Contract[]>(`/contracts${query ? `?${query}` : ""}`);
  },

  async get(id: string): Promise<Contract> {
    return request<Contract>(`/contracts/${id}`);
  },

  async create(data: {
    title: string;
    description?: string;
    contract_type?: string;
  }): Promise<Contract> {
    return request<Contract>("/contracts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async update(id: string, data: Partial<Contract>): Promise<Contract> {
    return request<Contract>(`/contracts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await request(`/contracts/${id}`, { method: "DELETE" });
  },

  async uploadDocument(
    contractId: string,
    file: File
  ): Promise<{ id: string; filename: string }> {
    const formData = new FormData();
    formData.append("file", file);

    const token = getAccessToken();
    const response = await fetch(
      `${API_BASE_URL}/contracts/${contractId}/documents`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.detail || "Upload failed",
        response.status
      );
    }

    return response.json();
  },
};

// ==================== DID API ====================

export const didApi = {
  async issue(): Promise<{
    did_address: string;
    status: string;
    message: string;
  }> {
    return request("/did/issue", { method: "POST" });
  },

  async getStatus(): Promise<UserDID> {
    return request<UserDID>("/did/status");
  },

  async verify(didAddress: string): Promise<{
    valid: boolean;
    did_address: string;
    on_chain_status: Record<string, unknown> | null;
    message: string;
  }> {
    return request(`/did/verify/${didAddress}`, {}, false);
  },

  async getDocument(): Promise<{
    did_address: string;
    document: Record<string, unknown>;
  }> {
    return request("/did/document");
  },

  async revoke(reason?: string): Promise<{ message: string }> {
    return request("/did/revoke", {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
};

// ==================== Signatures API ====================

export const signaturesApi = {
  async sign(data: {
    contract_id: string;
    signature_type: "draw" | "type" | "image";
    signature_data?: string;
    document_hash: string;
  }): Promise<ContractSignature> {
    return request<ContractSignature>("/signatures/sign", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getContractSignatures(contractId: string): Promise<{
    contract_id: string;
    signatures: ContractSignature[];
    all_parties_signed: boolean;
    total_parties: number;
    signed_count: number;
  }> {
    return request(`/signatures/contract/${contractId}`);
  },

  async get(signatureId: string): Promise<ContractSignature> {
    return request<ContractSignature>(`/signatures/${signatureId}`);
  },

  async verify(signatureId: string): Promise<{
    valid: boolean;
    signature_id: string;
    signer_did: string;
    document_hash: string;
    credential_verified: boolean;
    message: string;
  }> {
    return request("/signatures/verify", {
      method: "POST",
      body: JSON.stringify({ signature_id: signatureId }),
    }, false);
  },

  async revoke(signatureId: string, reason?: string): Promise<{ message: string }> {
    return request(`/signatures/${signatureId}/revoke`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
};

// ==================== Blockchain API ====================

export const blockchainApi = {
  async anchor(data: {
    contract_id: string;
    document_id?: string;
    document_hash: string;
  }): Promise<BlockchainAnchor> {
    return request<BlockchainAnchor>("/blockchain/anchor", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getAnchorStatus(anchorId: string): Promise<{
    id: string;
    status: string;
    tx_hash: string | null;
    block_number: number | null;
    confirmations: number;
    network: string;
    merkle_root: string | null;
    merkle_proof: string[] | null;
  }> {
    return request(`/blockchain/anchor/${anchorId}`);
  },

  async verifyDocument(documentHash: string): Promise<{
    verified: boolean;
    document_hash: string;
    anchor_id: string | null;
    tx_hash: string | null;
    block_number: number | null;
    anchored_at: string | null;
    network: string;
    message: string;
  }> {
    return request("/blockchain/verify", {
      method: "POST",
      body: JSON.stringify({ document_hash: documentHash }),
    }, false);
  },

  async batchAnchor(hashes: string[]): Promise<{
    batch_id: string;
    merkle_root: string;
    total_documents: number;
    status: string;
    tx_hash: string | null;
  }> {
    return request("/blockchain/batch-anchor", {
      method: "POST",
      body: JSON.stringify({ hashes }),
    });
  },

  async getCertificate(anchorId: string): Promise<Certificate> {
    return request<Certificate>(`/blockchain/certificate/${anchorId}`);
  },

  async getContractAnchors(contractId: string): Promise<BlockchainAnchor[]> {
    return request<BlockchainAnchor[]>(
      `/blockchain/contract/${contractId}/anchors`
    );
  },

  async getStats(): Promise<{
    total_anchors: number;
    confirmed_anchors: number;
    pending_anchors: number;
    total_certificates: number;
  }> {
    return request("/blockchain/stats");
  },
};

// ==================== Analysis API ====================

export const analysisApi = {
  async analyze(contractId: string): Promise<{
    id: string;
    contract_id: string;
    summary: string;
    safety_score: number;
    risks: Array<{
      type: string;
      severity: string;
      description: string;
      clause: string | null;
      suggestion: string | null;
    }>;
    questions: string[];
    status: string;
  }> {
    return request(`/analysis/contracts/${contractId}`, {
      method: "POST",
    });
  },

  async getAnalysis(analysisId: string): Promise<{
    id: string;
    contract_id: string;
    summary: string;
    safety_score: number;
    risks: Array<{
      type: string;
      severity: string;
      description: string;
    }>;
    questions: string[];
    status: string;
    created_at: string;
  }> {
    return request(`/analysis/${analysisId}`);
  },

  async getContractAnalyses(contractId: string): Promise<
    Array<{
      id: string;
      safety_score: number;
      status: string;
      created_at: string;
    }>
  > {
    return request(`/analysis/contracts/${contractId}`);
  },
};

// Default export with all APIs
export default {
  auth: authApi,
  contracts: contractsApi,
  did: didApi,
  signatures: signaturesApi,
  blockchain: blockchainApi,
  analysis: analysisApi,
};

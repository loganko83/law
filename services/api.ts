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
    credentials: "include",  // Include cookies for httpOnly token support
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
    try {
      // Call backend to clear httpOnly cookies
      await request<void>("/auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignore logout errors - clear local tokens anyway
    }
    clearTokens();
  },

  async refreshToken(): Promise<AuthTokens> {
    // Try to refresh using httpOnly cookie (cookies are sent automatically)
    // Also include localStorage token for backward compatibility
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    const body = refreshToken
      ? JSON.stringify({ refresh_token: refreshToken })
      : "{}";  // Empty body - server will use httpOnly cookie

    const tokens = await request<AuthTokens>("/auth/refresh", {
      method: "POST",
      body,
    }, false);
    setTokens(tokens);
    return tokens;
  },

  async getCurrentUser(): Promise<User> {
    return request<User>("/auth/me");
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    return request<User>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
};

// ==================== Contracts API ====================

// Paginated response type
interface PaginatedContracts {
  contracts: Contract[];
  total: number;
  page: number;
  page_size: number;
}

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
    const response = await request<PaginatedContracts>(`/contracts${query ? `?${query}` : ""}`);
    return response.contracts;
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

  async downloadCertificatePdf(anchorId: string): Promise<void> {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/blockchain/certificate/${anchorId}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new ApiError("Failed to download certificate", response.status);
    }

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SafeCon_Certificate_${anchorId}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
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
    analysis_id: string;
    status: string;
    message: string;
    websocket_channel: string;
  }> {
    return request("/ai/analyze", {
      method: "POST",
      body: JSON.stringify({ contract_id: contractId }),
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
    return request(`/ai/analysis/${analysisId}`);
  },

  async getContractAnalyses(contractId: string): Promise<
    Array<{
      id: string;
      safety_score: number;
      status: string;
      created_at: string;
    }>
  > {
    return request(`/ai/contract/${contractId}/analyses`);
  },
};

// ==================== Versions API ====================

export interface DocumentVersion {
  id: string;
  contract_id: string;
  version: number;
  file_name: string;
  file_size: number;
  document_hash: string;
  uploaded_by: string;
  upload_date: string;
  is_current: boolean;
}

export interface VersionComparison {
  version_a: DocumentVersion;
  version_b: DocumentVersion;
  changes_summary: string;
  similarity_score: number;
}

export const versionsApi = {
  async getVersionHistory(contractId: string): Promise<DocumentVersion[]> {
    return request<DocumentVersion[]>(`/versions/history/${contractId}`);
  },

  async uploadVersion(contractId: string, file: File): Promise<DocumentVersion> {
    const formData = new FormData();
    formData.append("file", file);

    const token = getAccessToken();
    const response = await fetch(
      `${API_BASE_URL}/versions/upload/${contractId}`,
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

  async compareVersions(
    versionAId: string,
    versionBId: string
  ): Promise<VersionComparison> {
    return request<VersionComparison>("/versions/compare", {
      method: "POST",
      body: JSON.stringify({
        version_a_id: versionAId,
        version_b_id: versionBId,
      }),
    });
  },

  async revertToVersion(contractId: string, version: number): Promise<{
    message: string;
    new_current_version: DocumentVersion;
  }> {
    return request(`/versions/revert/${contractId}`, {
      method: "POST",
      body: JSON.stringify({ version }),
    });
  },

  async downloadVersion(versionId: string): Promise<void> {
    const token = getAccessToken();
    const response = await fetch(
      `${API_BASE_URL}/versions/download/${versionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new ApiError("Failed to download version", response.status);
    }

    const blob = await response.blob();
    const contentDisposition = response.headers.get("Content-Disposition");
    const fileNameMatch = contentDisposition?.match(/filename="(.+)"/);
    const fileName = fileNameMatch ? fileNameMatch[1] : `document_v${versionId}.pdf`;

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

// ==================== Parties API ====================

export interface ContractParty {
  id: string;
  contract_id: string;
  role: "party_a" | "party_b" | "witness";
  name: string;
  email: string;
  phone?: string;
  signing_status: "pending" | "signed";
  signed_at?: string;
  invitation_sent_at?: string;
}

export const partiesApi = {
  async inviteParty(data: {
    contract_id: string;
    role: "party_a" | "party_b" | "witness";
    name: string;
    email: string;
    phone?: string;
  }): Promise<ContractParty> {
    return request<ContractParty>("/parties/invite", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getContractParties(contractId: string): Promise<ContractParty[]> {
    return request<ContractParty[]>(`/parties/contract/${contractId}`);
  },

  async removeParty(partyId: string): Promise<void> {
    await request(`/parties/${partyId}`, {
      method: "DELETE",
    });
  },

  async resendInvite(partyId: string): Promise<{ message: string }> {
    return request(`/parties/${partyId}/resend-invite`, {
      method: "POST",
    });
  },
};

// ==================== Sharing API ====================

export interface ShareLink {
  id: string;
  contract_id: string;
  token: string;
  share_url: string;
  expires_at: string;
  allow_download: boolean;
  password_protected: boolean;
  access_count: number;
  created_at: string;
  updated_at: string;
}

export const sharingApi = {
  async createShareLink(data: {
    contract_id: string;
    expires_in_hours?: number;
    allow_download?: boolean;
    password?: string;
  }): Promise<ShareLink> {
    return request<ShareLink>("/sharing/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getMyLinks(contractId?: string): Promise<ShareLink[]> {
    const query = contractId ? `?contract_id=${contractId}` : "";
    return request<ShareLink[]>(`/sharing/my-links${query}`);
  },

  async updateShareLink(
    token: string,
    data: {
      expires_in_hours?: number;
      allow_download?: boolean;
      password?: string;
    }
  ): Promise<ShareLink> {
    return request<ShareLink>(`/sharing/update/${token}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async revokeShareLink(token: string): Promise<{ message: string }> {
    return request(`/sharing/revoke/${token}`, {
      method: "DELETE",
    });
  },

  async accessShared(token: string, password?: string): Promise<{
    contract: Contract;
    allow_download: boolean;
  }> {
    const body = password ? JSON.stringify({ password }) : undefined;
    return request(`/sharing/access/${token}`, {
      method: password ? "POST" : "GET",
      body,
    }, false);
  },
};

// ==================== Subscriptions API ====================

export interface SubscriptionPlan {
  id: string;
  name: string;
  plan_type: "free" | "basic" | "pro" | "enterprise";
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_contracts: number | null;
  max_analyses_per_month: number | null;
  max_signatures_per_month: number | null;
  max_blockchain_anchors: number | null;
  max_storage_mb: number;
  has_ai_analysis: boolean;
  has_did_signing: boolean;
  has_blockchain_anchoring: boolean;
  has_premium_templates: boolean;
  has_api_access: boolean;
  has_priority_support: boolean;
  trial_days: number;
}

export interface UserSubscription {
  id: string;
  plan: SubscriptionPlan;
  status: "trial" | "active" | "cancelled" | "expired" | "past_due";
  billing_cycle: "monthly" | "yearly";
  current_period_start: string | null;
  current_period_end: string | null;
  trial_end: string | null;
  started_at: string;
}

export interface UsageStats {
  period_start: string;
  period_end: string;
  contracts_created: number;
  analyses_performed: number;
  signatures_made: number;
  blockchain_anchors: number;
  storage_used_mb: number;
  api_calls: number;
  contracts_limit: number | null;
  analyses_limit: number | null;
  signatures_limit: number | null;
  anchors_limit: number | null;
  storage_limit: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  is_paid: boolean;
  issued_at: string;
  due_date: string | null;
  pdf_url: string | null;
}

export const subscriptionsApi = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    return request<SubscriptionPlan[]>("/subscriptions/plans", {}, false);
  },

  async getCurrentSubscription(): Promise<UserSubscription> {
    return request<UserSubscription>("/subscriptions/current");
  },

  async subscribe(data: {
    plan_type: string;
    billing_cycle?: "monthly" | "yearly";
    payment_method_id?: string;
  }): Promise<UserSubscription> {
    return request<UserSubscription>("/subscriptions/subscribe", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async cancel(): Promise<{ message: string; effective_until: string }> {
    return request("/subscriptions/cancel", {
      method: "POST",
    });
  },

  async getUsage(): Promise<UsageStats> {
    return request<UsageStats>("/subscriptions/usage");
  },

  async getInvoices(skip = 0, limit = 20): Promise<Invoice[]> {
    return request<Invoice[]>(
      `/subscriptions/invoices?skip=${skip}&limit=${limit}`
    );
  },

  async upgrade(newPlanType: string): Promise<{ message: string; new_plan: string }> {
    return request(`/subscriptions/upgrade?new_plan_type=${newPlanType}`, {
      method: "POST",
    });
  },
};

// ==================== B2B API ====================

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
}

export interface APIKeyCreateResponse extends APIKey {
  api_key: string;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export interface B2BUsage {
  period_start: string;
  period_end: string;
  api_calls: number;
  contracts_created: number;
  analyses_performed: number;
}

export const b2bApi = {
  // API Key Management
  async createApiKey(data: {
    name: string;
    scopes?: string[];
    expires_in_days?: number;
  }): Promise<APIKeyCreateResponse> {
    return request<APIKeyCreateResponse>("/b2b/keys", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async listApiKeys(): Promise<APIKey[]> {
    return request<APIKey[]>("/b2b/keys");
  },

  async revokeApiKey(keyId: string): Promise<{ message: string }> {
    return request(`/b2b/keys/${keyId}`, {
      method: "DELETE",
    });
  },

  // Webhooks
  async createWebhook(data: {
    url: string;
    events: string[];
    secret?: string;
  }): Promise<WebhookConfig> {
    return request<WebhookConfig>("/b2b/webhooks", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async listWebhooks(): Promise<WebhookConfig[]> {
    return request<WebhookConfig[]>("/b2b/webhooks");
  },

  async deleteWebhook(webhookId: string): Promise<{ message: string }> {
    return request(`/b2b/webhooks/${webhookId}`, {
      method: "DELETE",
    });
  },

  // Usage
  async getUsage(): Promise<B2BUsage> {
    // This requires API key header, so we need special handling
    return request<B2BUsage>("/b2b/usage");
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
  versions: versionsApi,
  parties: partiesApi,
  sharing: sharingApi,
  subscriptions: subscriptionsApi,
  b2b: b2bApi,
};

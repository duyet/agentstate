"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AgentState: () => AgentState,
  AgentStateError: () => AgentStateError
});
module.exports = __toCommonJS(index_exports);
var AgentState = class {
  apiKey;
  baseUrl;
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || "https://agentstate.app/api";
  }
  async request(path, options) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options?.headers
      }
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new AgentStateError(
        body?.error?.message || `API error ${res.status}`,
        body?.error?.code || "UNKNOWN",
        res.status
      );
    }
    if (res.status === 204) return void 0;
    return res.json();
  }
  withQuery(path, params) {
    if (!params) return path;
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === void 0 || value === null) continue;
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        query.append(key, String(item));
      }
    }
    const qs = query.toString();
    return qs ? `${path}?${qs}` : path;
  }
  // Conversations
  async createConversation(data) {
    return this.request("/v1/conversations", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
  async getConversation(id) {
    return this.request(`/v1/conversations/${id}`);
  }
  async getConversationByExternalId(externalId) {
    return this.request(`/v1/conversations/by-external-id/${encodeURIComponent(externalId)}`);
  }
  async listConversations(params) {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.cursor) query.set("cursor", params.cursor);
    if (params?.order) query.set("order", params.order);
    const qs = query.toString();
    return this.request(`/v1/conversations${qs ? `?${qs}` : ""}`);
  }
  async updateConversation(id, data) {
    return this.request(`/v1/conversations/${id}`, {
      method: "PUT",
      body: JSON.stringify(data)
    });
  }
  async deleteConversation(id) {
    return this.request(`/v1/conversations/${id}`, { method: "DELETE" });
  }
  // Messages
  async appendMessages(conversationId, messages) {
    return this.request(`/v1/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ messages })
    });
  }
  async listMessages(conversationId, params) {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.after) query.set("after", params.after);
    const qs = query.toString();
    return this.request(`/v1/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`);
  }
  // AI
  async generateTitle(conversationId) {
    return this.request(`/v1/conversations/${conversationId}/generate-title`, { method: "POST" });
  }
  async generateFollowUps(conversationId) {
    return this.request(`/v1/conversations/${conversationId}/follow-ups`, { method: "POST" });
  }
  // Export
  async exportConversations(ids) {
    return this.request("/v1/conversations/export", {
      method: "POST",
      body: JSON.stringify(ids ? { ids } : {})
    });
  }
  // State records
  async upsertState(stateKey, data, options) {
    return this.request(`/v2/states/${encodeURIComponent(stateKey)}`, {
      method: "PUT",
      headers: options?.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : void 0,
      body: JSON.stringify(data)
    });
  }
  async getState(stateKey, params) {
    return this.request(this.withQuery(`/v2/states/${encodeURIComponent(stateKey)}`, params));
  }
  async queryStates(query = {}) {
    return this.request("/v2/states/query", {
      method: "POST",
      body: JSON.stringify(query)
    });
  }
  async deleteState(stateKey, params) {
    return this.request(
      this.withQuery(`/v2/states/${encodeURIComponent(stateKey)}`, {
        lease_id: params?.lease_id
      }),
      {
        method: "DELETE",
        headers: params?.idempotencyKey ? { "Idempotency-Key": params.idempotencyKey } : void 0
      }
    );
  }
  // State events and watch reads
  async listStateEvents(stateKey, params, options) {
    return this.request(
      this.withQuery(`/v2/states/${encodeURIComponent(stateKey)}/events`, params),
      {
        headers: options?.capabilityToken ? { Authorization: `Bearer ${options.capabilityToken}` } : void 0
      }
    );
  }
  // State leases
  async createStateLease(stateKey, data) {
    return this.request(`/v2/states/${encodeURIComponent(stateKey)}/lease`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
  async renewStateLease(id, data = {}, options) {
    return this.request(`/v2/leases/${encodeURIComponent(id)}/renew`, {
      method: "POST",
      headers: options?.capabilityToken ? { Authorization: `Bearer ${options.capabilityToken}` } : void 0,
      body: JSON.stringify(data)
    });
  }
  async releaseStateLease(id, options) {
    return this.request(`/v2/leases/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: options?.capabilityToken ? { Authorization: `Bearer ${options.capabilityToken}` } : void 0
    });
  }
  // Capability tokens
  async createCapabilityToken(data) {
    return this.request("/v2/capability-tokens", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
  async listCapabilityTokens() {
    return this.request("/v2/capability-tokens");
  }
  async revokeCapabilityToken(id) {
    return this.request(`/v2/capability-tokens/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  }
  // Claims
  async createClaim(data) {
    return this.request("/v2/claims", {
      method: "POST",
      body: JSON.stringify(data)
    });
  }
  async listClaims(params) {
    return this.request(this.withQuery("/v2/claims", params));
  }
  async getClaim(id) {
    return this.request(`/v2/claims/${encodeURIComponent(id)}`);
  }
  async verifyClaim(id) {
    return this.request(`/v2/claims/${encodeURIComponent(id)}/verify`, {
      method: "POST"
    });
  }
};
var AgentStateError = class extends Error {
  code;
  status;
  constructor(message, code, status) {
    super(message);
    this.name = "AgentStateError";
    this.code = code;
    this.status = status;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AgentState,
  AgentStateError
});

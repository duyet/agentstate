// Auto-generated OpenAPI 3.1 spec for AgentState API

export const OPENAPI_SPEC = `{
  "openapi": "3.1.0",
  "info": {
    "title": "AgentState API",
    "version": "0.1.0",
    "description": "Conversation history database-as-a-service for AI agents. Store, retrieve, and manage AI agent conversations via a simple REST API.",
    "contact": {
      "url": "https://github.com/duyet/agentstate"
    }
  },
  "servers": [
    {
      "url": "https://agentstate.app/api",
      "description": "Production"
    }
  ],
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "description": "API key starting with \`as_live_\`"
      }
    },
    "schemas": {
      "Error": {
        "type": "object",
        "required": ["error"],
        "properties": {
          "error": {
            "type": "object",
            "required": ["code", "message"],
            "properties": {
              "code": {
                "type": "string",
                "enum": ["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "INTERNAL_ERROR"],
                "example": "NOT_FOUND"
              },
              "message": {
                "type": "string",
                "example": "Conversation not found"
              }
            }
          }
        }
      },
      "MessageInput": {
        "type": "object",
        "required": ["role", "content"],
        "properties": {
          "role": {
            "type": "string",
            "enum": ["system", "user", "assistant", "tool"],
            "example": "user"
          },
          "content": {
            "type": "string",
            "minLength": 1,
            "example": "Hello! How can I help?"
          },
          "metadata": {
            "type": "object",
            "additionalProperties": true,
            "nullable": true,
            "example": {"model": "claude-sonnet-4"}
          },
          "token_count": {
            "type": "integer",
            "minimum": 0,
            "example": 12
          }
        }
      },
      "Message": {
        "type": "object",
        "required": ["id", "role", "content", "token_count", "created_at"],
        "properties": {
          "id": {
            "type": "string",
            "example": "V1StGXR8_Z5jdHi6B-myT"
          },
          "role": {
            "type": "string",
            "enum": ["system", "user", "assistant", "tool"],
            "example": "user"
          },
          "content": {
            "type": "string",
            "example": "Hello!"
          },
          "metadata": {
            "type": "object",
            "additionalProperties": true,
            "nullable": true,
            "example": null
          },
          "token_count": {
            "type": "integer",
            "example": 5
          },
          "created_at": {
            "type": "integer",
            "description": "Unix timestamp in milliseconds",
            "example": 1710500000000
          }
        }
      },
      "Conversation": {
        "type": "object",
        "required": ["id", "project_id", "message_count", "token_count", "created_at", "updated_at"],
        "properties": {
          "id": {
            "type": "string",
            "example": "V1StGXR8_Z5jdHi6B-myT"
          },
          "project_id": {
            "type": "string",
            "example": "pj_abc123"
          },
          "external_id": {
            "type": "string",
            "nullable": true,
            "example": "session-xyz-789"
          },
          "title": {
            "type": "string",
            "nullable": true,
            "example": "Support conversation about billing"
          },
          "metadata": {
            "type": "object",
            "additionalProperties": true,
            "nullable": true,
            "example": {"user_id": "usr_123", "model": "claude-sonnet-4"}
          },
          "message_count": {
            "type": "integer",
            "example": 6
          },
          "token_count": {
            "type": "integer",
            "example": 1200
          },
          "created_at": {
            "type": "integer",
            "description": "Unix timestamp in milliseconds",
            "example": 1710500000000
          },
          "updated_at": {
            "type": "integer",
            "description": "Unix timestamp in milliseconds",
            "example": 1710500060000
          }
        }
      },
      "ConversationWithMessages": {
        "allOf": [
          {"$ref": "#/components/schemas/Conversation"},
          {
            "type": "object",
            "required": ["messages"],
            "properties": {
              "messages": {
                "type": "array",
                "items": {"$ref": "#/components/schemas/Message"}
              }
            }
          }
        ]
      },
      "Pagination": {
        "type": "object",
        "required": ["limit"],
        "properties": {
          "limit": {
            "type": "integer",
            "example": 50
          },
          "next_cursor": {
            "type": "string",
            "nullable": true,
            "example": "1710500060000"
          }
        }
      },
      "ApiKey": {
        "type": "object",
        "required": ["id", "name", "key_prefix", "created_at"],
        "properties": {
          "id": {
            "type": "string",
            "example": "key_V1StGXR8"
          },
          "name": {
            "type": "string",
            "example": "Default"
          },
          "key_prefix": {
            "type": "string",
            "example": "as_live_abc1"
          },
          "created_at": {
            "type": "integer",
            "description": "Unix timestamp in milliseconds",
            "example": 1710500000000
          },
          "last_used_at": {
            "type": "integer",
            "nullable": true,
            "description": "Unix timestamp in milliseconds",
            "example": 1710500060000
          },
          "revoked_at": {
            "type": "integer",
            "nullable": true,
            "description": "Unix timestamp in milliseconds",
            "example": null
          }
        }
      },
      "Project": {
        "type": "object",
        "required": ["id", "org_id", "name", "slug", "created_at"],
        "properties": {
          "id": {
            "type": "string",
            "example": "pj_V1StGXR8"
          },
          "org_id": {
            "type": "string",
            "example": "org_abc123"
          },
          "name": {
            "type": "string",
            "example": "My AI Agent"
          },
          "slug": {
            "type": "string",
            "example": "my-ai-agent"
          },
          "created_at": {
            "type": "integer",
            "description": "Unix timestamp in milliseconds",
            "example": 1710500000000
          }
        }
      },
      "ProjectWithKeys": {
        "allOf": [
          {"$ref": "#/components/schemas/Project"},
          {
            "type": "object",
            "required": ["api_keys"],
            "properties": {
              "api_keys": {
                "type": "array",
                "items": {"$ref": "#/components/schemas/ApiKey"}
              }
            }
          }
        ]
      }
    },
    "responses": {
      "BadRequest": {
        "description": "Invalid request body or parameters",
        "content": {
          "application/json": {
            "schema": {"$ref": "#/components/schemas/Error"},
            "example": {"error": {"code": "BAD_REQUEST", "message": "name is required"}}
          }
        }
      },
      "Unauthorized": {
        "description": "Missing or invalid API key",
        "content": {
          "application/json": {
            "schema": {"$ref": "#/components/schemas/Error"},
            "example": {"error": {"code": "UNAUTHORIZED", "message": "Invalid API key"}}
          }
        }
      },
      "Forbidden": {
        "description": "Action not allowed for this API key",
        "content": {
          "application/json": {
            "schema": {"$ref": "#/components/schemas/Error"},
            "example": {"error": {"code": "FORBIDDEN", "message": "Cannot manage keys for another project"}}
          }
        }
      },
      "NotFound": {
        "description": "Resource not found",
        "content": {
          "application/json": {
            "schema": {"$ref": "#/components/schemas/Error"},
            "example": {"error": {"code": "NOT_FOUND", "message": "Conversation not found"}}
          }
        }
      },
      "Conflict": {
        "description": "Resource already exists",
        "content": {
          "application/json": {
            "schema": {"$ref": "#/components/schemas/Error"},
            "example": {"error": {"code": "CONFLICT", "message": "A conversation with this external_id already exists"}}
          }
        }
      }
    }
  },
  "tags": [
    {
      "name": "Health",
      "description": "Service status"
    },
    {
      "name": "Conversations",
      "description": "Create and manage agent conversations"
    },
    {
      "name": "Messages",
      "description": "Append and retrieve messages within a conversation"
    },
    {
      "name": "AI",
      "description": "AI-powered enhancements for conversations"
    },
    {
      "name": "Projects",
      "description": "Project management (dashboard use)"
    },
    {
      "name": "Keys",
      "description": "API key management"
    }
  ],
  "paths": {
    "/api": {
      "get": {
        "tags": ["Health"],
        "summary": "Health check",
        "description": "Returns service name, version, and status. Does not require authentication.",
        "operationId": "getHealth",
        "security": [],
        "responses": {
          "200": {
            "description": "Service is healthy",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["name", "version", "status"],
                  "properties": {
                    "name": {"type": "string", "example": "agentstate"},
                    "version": {"type": "string", "example": "0.1.0"},
                    "status": {"type": "string", "example": "ok"}
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/conversations": {
      "post": {
        "tags": ["Conversations"],
        "summary": "Create conversation",
        "description": "Create a new conversation, optionally seeding it with an initial set of messages in a single request.",
        "operationId": "createConversation",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "external_id": {
                    "type": "string",
                    "description": "Your own identifier for this conversation. Must be unique within the project.",
                    "example": "session-xyz-789"
                  },
                  "title": {
                    "type": "string",
                    "example": "Support conversation about billing"
                  },
                  "metadata": {
                    "type": "object",
                    "additionalProperties": true,
                    "example": {"user_id": "usr_123", "model": "claude-sonnet-4"}
                  },
                  "messages": {
                    "type": "array",
                    "items": {"$ref": "#/components/schemas/MessageInput"}
                  }
                }
              },
              "example": {
                "external_id": "session-xyz-789",
                "metadata": {"user_id": "usr_123"},
                "messages": [
                  {"role": "system", "content": "You are a helpful assistant."},
                  {"role": "user", "content": "Hello!", "token_count": 3},
                  {"role": "assistant", "content": "Hi! How can I help?", "token_count": 9}
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Conversation created",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/ConversationWithMessages"}
              }
            }
          },
          "400": {"$ref": "#/components/responses/BadRequest"},
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "409": {"$ref": "#/components/responses/Conflict"}
        }
      },
      "get": {
        "tags": ["Conversations"],
        "summary": "List conversations",
        "description": "Returns a paginated list of conversations for the authenticated project, ordered by 'updated_at'.",
        "operationId": "listConversations",
        "parameters": [
          {
            "name": "limit",
            "in": "query",
            "description": "Number of results to return (1–100, default 50)",
            "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 50}
          },
          {
            "name": "cursor",
            "in": "query",
            "description": "Pagination cursor — value of 'next_cursor' from the previous page",
            "schema": {"type": "string"}
          },
          {
            "name": "order",
            "in": "query",
            "description": "Sort direction on 'updated_at'",
            "schema": {"type": "string", "enum": ["asc", "desc"], "default": "desc"}
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list of conversations",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["data", "pagination"],
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/Conversation"}
                    },
                    "pagination": {"$ref": "#/components/schemas/Pagination"}
                  }
                }
              }
            }
          },
          "401": {"$ref": "#/components/responses/Unauthorized"}
        }
      }
    },
    "/api/v1/conversations/export": {
      "post": {
        "tags": ["Conversations"],
        "summary": "Bulk export conversations",
        "description": "Export up to 100 conversations with their full message history. Omit 'ids' to export the 100 most recently updated conversations.",
        "operationId": "exportConversations",
        "requestBody": {
          "required": false,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "maxItems": 100,
                    "description": "Specific conversation IDs to export. Omit to export the 100 most recent.",
                    "example": ["V1StGXR8_Z5jdHi6B-myT", "abc123"]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Exported conversations with messages",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["data", "count"],
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/ConversationWithMessages"}
                    },
                    "count": {
                      "type": "integer",
                      "example": 3
                    }
                  }
                }
              }
            }
          },
          "400": {"$ref": "#/components/responses/BadRequest"},
          "401": {"$ref": "#/components/responses/Unauthorized"}
        }
      }
    },
    "/api/v1/conversations/search": {
      "get": {
        "tags": ["Conversations"],
        "summary": "Search conversations by content",
        "description": "Search across message content within the authenticated project. Returns matching conversations ordered by 'updated_at' descending, with a snippet of the matching message text.",
        "operationId": "searchConversations",
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "required": true,
            "description": "Search query — matched against message content using case-insensitive substring search",
            "schema": {"type": "string", "minLength": 1},
            "example": "billing issue"
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Number of results to return (1–100, default 20)",
            "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 20}
          },
          {
            "name": "cursor",
            "in": "query",
            "description": "Pagination cursor — value of 'next_cursor' from the previous page",
            "schema": {"type": "string"}
          }
        ],
        "responses": {
          "200": {
            "description": "Matching conversations with snippet context",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["data", "next_cursor"],
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "required": ["id", "title", "snippet", "message_count", "created_at", "updated_at"],
                        "properties": {
                          "id": {
                            "type": "string",
                            "example": "V1StGXR8_Z5jdHi6B-myT"
                          },
                          "title": {
                            "type": "string",
                            "nullable": true,
                            "example": "Support conversation about billing"
                          },
                          "snippet": {
                            "type": "string",
                            "description": "Excerpt from the matching message, up to 200 characters with ellipsis when truncated",
                            "example": "…I have a billing issue with my subscription…"
                          },
                          "message_count": {
                            "type": "integer",
                            "example": 6
                          },
                          "created_at": {
                            "type": "integer",
                            "description": "Unix timestamp in milliseconds",
                            "example": 1710500000000
                          },
                          "updated_at": {
                            "type": "integer",
                            "description": "Unix timestamp in milliseconds",
                            "example": 1710500060000
                          }
                        }
                      }
                    },
                    "next_cursor": {
                      "type": "string",
                      "nullable": true,
                      "description": "Pass as 'cursor' in the next request to fetch the next page. Null when no further results exist.",
                      "example": "1710500060000"
                    }
                  }
                }
              }
            }
          },
          "400": {"$ref": "#/components/responses/BadRequest"},
          "401": {"$ref": "#/components/responses/Unauthorized"}
        }
      }
    },
    "/api/v1/conversations/by-external-id/{externalId}": {
      "get": {
        "tags": ["Conversations"],
        "summary": "Get conversation by external ID",
        "description": "Look up a conversation using your own identifier ('external_id'). Returns the conversation with its full message history.",
        "operationId": "getConversationByExternalId",
        "parameters": [
          {
            "name": "externalId",
            "in": "path",
            "required": true,
            "description": "Your own identifier set when creating the conversation",
            "schema": {"type": "string"},
            "example": "session-xyz-789"
          }
        ],
        "responses": {
          "200": {
            "description": "Conversation with messages",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/ConversationWithMessages"}
              }
            }
          },
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      }
    },
    "/api/v1/conversations/{id}": {
      "get": {
        "tags": ["Conversations"],
        "summary": "Get conversation",
        "description": "Retrieve a conversation with its full message history by its AgentState ID.",
        "operationId": "getConversation",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Conversation ID",
            "schema": {"type": "string"},
            "example": "V1StGXR8_Z5jdHi6B-myT"
          }
        ],
        "responses": {
          "200": {
            "description": "Conversation with messages",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/ConversationWithMessages"}
              }
            }
          },
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      },
      "put": {
        "tags": ["Conversations"],
        "summary": "Update conversation",
        "description": "Update the title and/or metadata of a conversation.",
        "operationId": "updateConversation",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Conversation ID",
            "schema": {"type": "string"},
            "example": "V1StGXR8_Z5jdHi6B-myT"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "title": {
                    "type": "string",
                    "example": "Updated title"
                  },
                  "metadata": {
                    "type": "object",
                    "additionalProperties": true,
                    "example": {"resolved": true}
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Updated conversation",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/Conversation"}
              }
            }
          },
          "400": {"$ref": "#/components/responses/BadRequest"},
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      },
      "delete": {
        "tags": ["Conversations"],
        "summary": "Delete conversation",
        "description": "Permanently delete a conversation and all its messages.",
        "operationId": "deleteConversation",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Conversation ID",
            "schema": {"type": "string"},
            "example": "V1StGXR8_Z5jdHi6B-myT"
          }
        ],
        "responses": {
          "204": {
            "description": "Conversation deleted"
          },
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      }
    },
    "/api/v1/conversations/{id}/messages": {
      "post": {
        "tags": ["Messages"],
        "summary": "Append messages",
        "description": "Append one or more messages to an existing conversation. Atomically increments 'message_count' and 'token_count'.",
        "operationId": "appendMessages",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Conversation ID",
            "schema": {"type": "string"},
            "example": "V1StGXR8_Z5jdHi6B-myT"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["messages"],
                "properties": {
                  "messages": {
                    "type": "array",
                    "items": {"$ref": "#/components/schemas/MessageInput"},
                    "minItems": 1
                  }
                }
              },
              "example": {
                "messages": [
                  {"role": "user", "content": "What is the weather?", "token_count": 6},
                  {"role": "assistant", "content": "Let me check for you.", "token_count": 8}
                ]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Messages appended",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["messages"],
                  "properties": {
                    "messages": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/Message"}
                    }
                  }
                }
              }
            }
          },
          "400": {"$ref": "#/components/responses/BadRequest"},
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      },
      "get": {
        "tags": ["Messages"],
        "summary": "List messages",
        "description": "Returns a paginated list of messages for the conversation, ordered chronologically.",
        "operationId": "listMessages",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Conversation ID",
            "schema": {"type": "string"},
            "example": "V1StGXR8_Z5jdHi6B-myT"
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Number of messages to return (1–500, default 100)",
            "schema": {"type": "integer", "minimum": 1, "maximum": 500, "default": 100}
          },
          {
            "name": "after",
            "in": "query",
            "description": "Message ID cursor — return messages created after this message",
            "schema": {"type": "string"}
          }
        ],
        "responses": {
          "200": {
            "description": "Paginated list of messages",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["data", "pagination"],
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/Message"}
                    },
                    "pagination": {"$ref": "#/components/schemas/Pagination"}
                  }
                }
              }
            }
          },
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      }
    },
    "/api/v1/conversations/{id}/generate-title": {
      "post": {
        "tags": ["AI"],
        "summary": "Generate title",
        "description": "Use AI to auto-generate a concise title for the conversation based on its first 20 messages. The title is saved and returned.",
        "operationId": "generateTitle",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Conversation ID",
            "schema": {"type": "string"},
            "example": "V1StGXR8_Z5jdHi6B-myT"
          }
        ],
        "responses": {
          "200": {
            "description": "Generated title",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["title"],
                  "properties": {
                    "title": {
                      "type": "string",
                      "example": "Billing support inquiry"
                    }
                  }
                }
              }
            }
          },
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      }
    },
    "/api/v1/conversations/{id}/follow-ups": {
      "post": {
        "tags": ["AI"],
        "summary": "Generate follow-up questions",
        "description": "Use AI to generate suggested follow-up questions based on the last 20 messages in the conversation.",
        "operationId": "generateFollowUps",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Conversation ID",
            "schema": {"type": "string"},
            "example": "V1StGXR8_Z5jdHi6B-myT"
          }
        ],
        "responses": {
          "200": {
            "description": "Follow-up questions",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["questions"],
                  "properties": {
                    "questions": {
                      "type": "array",
                      "items": {"type": "string"},
                      "example": [
                        "What is your account email?",
                        "When did the charge occur?",
                        "Have you contacted your bank yet?"
                      ]
                    }
                  }
                }
              }
            }
          },
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      }
    },
    "/api/v1/projects": {
      "post": {
        "tags": ["Projects"],
        "summary": "Create project",
        "description": "Create a new project. Automatically generates a default API key returned in the response.",
        "operationId": "createProject",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name", "slug"],
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "example": "My AI Agent"
                  },
                  "slug": {
                    "type": "string",
                    "minLength": 1,
                    "pattern": "^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$",
                    "description": "Lowercase alphanumeric with hyphens. Unique within the org.",
                    "example": "my-ai-agent"
                  },
                  "org_id": {
                    "type": "string",
                    "description": "Organization identifier. Defaults to the default org.",
                    "example": "org_clerk_abc123"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Project created with its default API key",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["project", "api_key"],
                  "properties": {
                    "project": {"$ref": "#/components/schemas/Project"},
                    "api_key": {
                      "type": "object",
                      "required": ["id", "name", "key_prefix", "key", "created_at"],
                      "properties": {
                        "id": {"type": "string", "example": "key_V1StGXR8"},
                        "name": {"type": "string", "example": "Default"},
                        "key_prefix": {"type": "string", "example": "as_live_abc1"},
                        "key": {
                          "type": "string",
                          "description": "Full API key — shown only once. Store it securely.",
                          "example": "as_live_abc123fullkey"
                        },
                        "created_at": {"type": "integer", "example": 1710500000000}
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {"$ref": "#/components/responses/BadRequest"},
          "409": {"$ref": "#/components/responses/Conflict"}
        }
      },
      "get": {
        "tags": ["Projects"],
        "summary": "List projects",
        "description": "Returns all projects for the given org, including active API key counts.",
        "operationId": "listProjects",
        "security": [],
        "parameters": [
          {
            "name": "org_id",
            "in": "query",
            "description": "Organization identifier. Defaults to the default org.",
            "schema": {"type": "string"}
          }
        ],
        "responses": {
          "200": {
            "description": "List of projects",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["data"],
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {
                        "allOf": [
                          {"$ref": "#/components/schemas/Project"},
                          {
                            "type": "object",
                            "properties": {
                              "key_count": {
                                "type": "integer",
                                "description": "Number of active (non-revoked) API keys",
                                "example": 2
                              }
                            }
                          }
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/projects/by-slug/{slug}": {
      "get": {
        "tags": ["Projects"],
        "summary": "Get project by slug",
        "description": "Retrieve a project and its API keys using the project slug.",
        "operationId": "getProjectBySlug",
        "security": [],
        "parameters": [
          {
            "name": "slug",
            "in": "path",
            "required": true,
            "description": "Project slug",
            "schema": {"type": "string"},
            "example": "my-ai-agent"
          }
        ],
        "responses": {
          "200": {
            "description": "Project with API keys",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/ProjectWithKeys"}
              }
            }
          },
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      }
    },
    "/api/v1/projects/{id}": {
      "get": {
        "tags": ["Projects"],
        "summary": "Get project",
        "description": "Retrieve a project and all its API keys by project ID.",
        "operationId": "getProject",
        "security": [],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Project ID",
            "schema": {"type": "string"},
            "example": "pj_V1StGXR8"
          }
        ],
        "responses": {
          "200": {
            "description": "Project with API keys",
            "content": {
              "application/json": {
                "schema": {"$ref": "#/components/schemas/ProjectWithKeys"}
              }
            }
          },
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      }
    },
    "/api/v1/projects/{id}/conversations": {
      "get": {
        "tags": ["Projects"],
        "summary": "List project conversations (dashboard)",
        "description": "List conversations for a project. Intended for dashboard use — does not require API key auth.",
        "operationId": "listProjectConversations",
        "security": [],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Project ID",
            "schema": {"type": "string"},
            "example": "pj_V1StGXR8"
          },
          {
            "name": "limit",
            "in": "query",
            "description": "Number of results (1–100, default 50)",
            "schema": {"type": "integer", "minimum": 1, "maximum": 100, "default": 50}
          }
        ],
        "responses": {
          "200": {
            "description": "List of conversations",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["data"],
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/Conversation"}
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/projects/{id}/conversations/{convId}/messages": {
      "get": {
        "tags": ["Projects"],
        "summary": "List conversation messages (dashboard)",
        "description": "List all messages in a conversation. Intended for dashboard use — does not require API key auth.",
        "operationId": "listProjectConversationMessages",
        "security": [],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Project ID",
            "schema": {"type": "string"},
            "example": "pj_V1StGXR8"
          },
          {
            "name": "convId",
            "in": "path",
            "required": true,
            "description": "Conversation ID",
            "schema": {"type": "string"},
            "example": "V1StGXR8_Z5jdHi6B-myT"
          }
        ],
        "responses": {
          "200": {
            "description": "List of messages",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["data"],
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/Message"}
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/v1/projects/{id}/keys": {
      "post": {
        "tags": ["Keys"],
        "summary": "Create API key",
        "description": "Generate a new API key for the project. The full key value is only returned once.",
        "operationId": "createProjectKey",
        "security": [],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Project ID",
            "schema": {"type": "string"},
            "example": "pj_V1StGXR8"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name"],
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "example": "Production"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "API key created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["id", "name", "key_prefix", "key", "created_at"],
                  "properties": {
                    "id": {"type": "string", "example": "key_V1StGXR8"},
                    "name": {"type": "string", "example": "Production"},
                    "key_prefix": {"type": "string", "example": "as_live_abc1"},
                    "key": {
                      "type": "string",
                      "description": "Full API key — shown only once. Store it securely.",
                      "example": "as_live_abc123fullkey"
                    },
                    "created_at": {"type": "integer", "example": 1710500000000}
                  }
                }
              }
            }
          },
          "400": {"$ref": "#/components/responses/BadRequest"},
          "404": {"$ref": "#/components/responses/NotFound"}
        }
      }
    },
    "/api/v1/projects/{id}/keys/{keyId}": {
      "delete": {
        "tags": ["Keys"],
        "summary": "Revoke API key",
        "description": "Revoke an API key. The key is soft-deleted ('revoked_at' is set) and will no longer authenticate requests.",
        "operationId": "revokeProjectKey",
        "security": [],
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "description": "Project ID",
            "schema": {"type": "string"},
            "example": "pj_V1StGXR8"
          },
          {
            "name": "keyId",
            "in": "path",
            "required": true,
            "description": "API key ID",
            "schema": {"type": "string"},
            "example": "key_V1StGXR8"
          }
        ],
        "responses": {
          "204": {
            "description": "Key revoked"
          }
        }
      }
    },
    "/api/projects/{projectId}/keys": {
      "post": {
        "tags": ["Keys"],
        "summary": "Create API key (authenticated)",
        "description": "Generate a new API key for the authenticated project. Requires a valid API key for the same project.",
        "operationId": "createKeyAuthenticated",
        "parameters": [
          {
            "name": "projectId",
            "in": "path",
            "required": true,
            "description": "Project ID (must match the authenticated project)",
            "schema": {"type": "string"},
            "example": "pj_V1StGXR8"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["name"],
                "properties": {
                  "name": {
                    "type": "string",
                    "minLength": 1,
                    "example": "Staging"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "API key created",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["id", "name", "key_prefix", "key", "created_at"],
                  "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "key_prefix": {"type": "string"},
                    "key": {"type": "string", "description": "Full key — shown only once"},
                    "created_at": {"type": "integer"},
                    "last_used_at": {"type": "integer", "nullable": true},
                    "revoked_at": {"type": "integer", "nullable": true}
                  }
                }
              }
            }
          },
          "400": {"$ref": "#/components/responses/BadRequest"},
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "403": {"$ref": "#/components/responses/Forbidden"}
        }
      },
      "get": {
        "tags": ["Keys"],
        "summary": "List API keys (authenticated)",
        "description": "List all API keys for the authenticated project.",
        "operationId": "listKeysAuthenticated",
        "parameters": [
          {
            "name": "projectId",
            "in": "path",
            "required": true,
            "description": "Project ID (must match the authenticated project)",
            "schema": {"type": "string"},
            "example": "pj_V1StGXR8"
          }
        ],
        "responses": {
          "200": {
            "description": "List of API keys",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": ["data"],
                  "properties": {
                    "data": {
                      "type": "array",
                      "items": {"$ref": "#/components/schemas/ApiKey"}
                    }
                  }
                }
              }
            }
          },
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "403": {"$ref": "#/components/responses/Forbidden"}
        }
      }
    },
    "/api/projects/{projectId}/keys/{keyId}": {
      "delete": {
        "tags": ["Keys"],
        "summary": "Revoke API key (authenticated)",
        "description": "Revoke an API key for the authenticated project.",
        "operationId": "revokeKeyAuthenticated",
        "parameters": [
          {
            "name": "projectId",
            "in": "path",
            "required": true,
            "description": "Project ID (must match the authenticated project)",
            "schema": {"type": "string"},
            "example": "pj_V1StGXR8"
          },
          {
            "name": "keyId",
            "in": "path",
            "required": true,
            "description": "API key ID to revoke",
            "schema": {"type": "string"},
            "example": "key_V1StGXR8"
          }
        ],
        "responses": {
          "204": {
            "description": "Key revoked"
          },
          "401": {"$ref": "#/components/responses/Unauthorized"},
          "403": {"$ref": "#/components/responses/Forbidden"}
        }
      }
    }
  }
}`;

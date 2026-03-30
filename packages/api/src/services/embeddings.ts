// ---------------------------------------------------------------------------
// Embeddings service — Vectorize + Workers AI for semantic search
// ---------------------------------------------------------------------------

/** Vector metadata stored alongside each embedding in Vectorize */
export type VectorMetadata = Record<string, string | number>;

/** Create vector metadata for a message */
export function messageVectorMeta(
  projectId: string,
  conversationId: string,
  messageId: string,
  role: string,
  createdAt: number,
): VectorMetadata {
  return {
    project_id: projectId,
    conversation_id: conversationId,
    message_id: messageId,
    role,
    created_at: createdAt,
  };
}

/** Typed metadata extracted from Vectorize vector results */
export interface TypedVectorMetadata {
  project_id: string;
  conversation_id: string;
  message_id: string;
  role: string;
  created_at: number;
}

/** Result from a vector query */
export interface VectorQueryResult {
  id: string;
  score: number;
  metadata: TypedVectorMetadata;
}

/** Embedding model configuration */
const EMBEDDING_MODEL = "@cf/baai/bge-m3" as unknown as keyof AiModels;
const VECTORIZE_INDEX = "VECTORIZE_INDEX";

/** Vector ID format for message embeddings */
export function vectorId(messageId: string): string {
  return `msg_${messageId}`;
}

/**
 * Generate a 768-dimension embedding vector using Workers AI.
 */
export async function generateEmbedding(ai: Ai, text: string): Promise<Float32Array> {
  const result = await ai.run(EMBEDDING_MODEL, { text });

  const data = (result as { data?: Array<{ embedding?: number[] }> }).data;
  if (!data || data.length === 0 || !data[0].embedding) {
    throw new Error("Embedding generation returned no data");
  }

  return new Float32Array(data[0].embedding);
}

/**
 * Upsert a vector into the Vectorize index.
 */
export async function upsertVector(
  index: VectorizeIndex,
  messageId: string,
  vector: Float32Array,
  metadata: VectorMetadata,
): Promise<void> {
  await index.upsert([
    {
      id: vectorId(messageId),
      values: Array.from(vector),
      metadata,
    },
  ]);
}

/**
 * Query the Vectorize index for similar vectors.
 */
export async function queryVectors(
  index: VectorizeIndex,
  vector: Float32Array,
  topK: number,
  filter?: { project_id: string },
): Promise<VectorQueryResult[]> {
  const result = await index.query(Array.from(vector), {
    topK,
    filter: filter ? { project_id: filter.project_id } : undefined,
    returnMetadata: "all",
  });

  if (!result.matches) return [];

  return result.matches.map((match: { id: string; score: number; metadata?: Record<string, unknown> }) => ({
    id: match.id,
    score: match.score,
    metadata: {
      project_id: String(match.metadata?.project_id ?? ""),
      conversation_id: String(match.metadata?.conversation_id ?? ""),
      message_id: String(match.metadata?.message_id ?? ""),
      role: String(match.metadata?.role ?? ""),
      created_at: Number(match.metadata?.created_at ?? 0),
    } as TypedVectorMetadata,
  }));
}

/**
 * Delete vectors for a list of message IDs from the Vectorize index.
 */
export async function deleteVectors(
  index: VectorizeIndex,
  messageIds: string[],
): Promise<void> {
  if (messageIds.length === 0) return;
  const ids = messageIds.map(vectorId);
  // Vectorize delete supports arrays of IDs
  await index.deleteByIds(ids);
}

/**
 * Generate embedding and upsert to Vectorize in one call.
 * Used during message creation to embed on write.
 */
export async function embedAndUpsert(
  ai: Ai,
  index: VectorizeIndex,
  messageId: string,
  text: string,
  metadata: VectorMetadata,
): Promise<void> {
  const vector = await generateEmbedding(ai, text);
  await upsertVector(index, messageId, vector, metadata);
}

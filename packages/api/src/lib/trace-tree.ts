/**
 * Shape of a deserialized message as returned by `deserializeMessage()`.
 * Only the fields used for tree building are listed.
 */
interface MessageForTree {
  id: string;
  parent_message_id: string | null;
  start_time: number | null;
  created_at: number;
  [key: string]: unknown;
}

export interface ObservationNode extends MessageForTree {
  children: ObservationNode[];
}

/**
 * Build a tree of observation nodes from a flat list of messages.
 *
 * Each message with a `parent_message_id` is placed as a child of its parent.
 * Messages without a parent become root nodes. Roots are sorted by
 * `start_time` (falling back to `created_at`).
 */
export function buildObservationTree(msgs: MessageForTree[]): ObservationNode[] {
  const nodeMap = new Map<string, ObservationNode>();
  const roots: ObservationNode[] = [];

  // First pass: create all nodes with empty children arrays
  for (const msg of msgs) {
    nodeMap.set(msg.id, { ...msg, children: [] });
  }

  // Second pass: wire parent-child relationships
  for (const msg of msgs) {
    const node = nodeMap.get(msg.id)!;
    if (msg.parent_message_id && nodeMap.has(msg.parent_message_id)) {
      nodeMap.get(msg.parent_message_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort roots by start_time, falling back to created_at
  roots.sort((a, b) => {
    const aTime = a.start_time ?? a.created_at;
    const bTime = b.start_time ?? b.created_at;
    return aTime - bTime;
  });

  return roots;
}

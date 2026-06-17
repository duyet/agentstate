import { AgentState } from "../../packages/sdk/src/index";

/**
 * Basic Conversation Management Example
 *
 * This example demonstrates:
 * 1. Creating a conversation with initial messages
 * 2. Appending messages
 * 3. Listing messages
 * 4. AI title generation
 * 5. AI follow-up question generation
 * 6. Cursor-based pagination
 * 7. Exporting conversations
 * 8. Updating conversation metadata
 * 9. Deleting the conversation
 */

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY || "your-api-key-here",
  baseUrl: "https://agentstate.app/api",
});

async function main() {
  console.log("AgentState SDK Basic Conversation Example\n");

  // 1. Create conversation with initial messages
  console.log("Creating conversation...");
  const conv = await client.createConversation({
    title: "Test Conversation",
    messages: [
      { role: "user", content: "What is AgentState?" },
      {
        role: "assistant",
        content: "AgentState is a conversation history database-as-a-service for AI agents.",
      },
    ],
  });

  console.log(`Created: ${conv.id}`);

  // 2. Append more messages
  console.log("\nAppending messages...");
  const { messages: appended } = await client.appendMessages(conv.id, [
    { role: "user", content: "Can you tell me more about the API?" },
  ]);
  console.log(`Appended ${appended.length} message(s)`);

  // 3. List messages with pagination
  console.log("\nListing messages...");
  const { data: msgs } = await client.listMessages(conv.id, { limit: 20 });
  console.log(`Total messages: ${msgs.length}`);
  console.log(`Roles: ${msgs.map((m) => m.role).join(" -> ")}`);

  // 4. AI-generated title
  console.log("\nGenerating AI title...");
  const { title } = await client.generateTitle(conv.id);
  console.log(`AI Title: ${title}`);

  // 5. AI-generated follow-up questions
  console.log("\nGenerating follow-up questions...");
  const { questions } = await client.generateFollowUps(conv.id);
  console.log(`Follow-ups: ${questions.slice(0, 2).join("; ")}`);

  // 6. List conversations with cursor-based pagination
  console.log("\nListing conversations (page 1)...");
  const page = await client.listConversations({ limit: 10 });
  console.log(`Found ${page.data.length} conversation(s) on this page`);
  console.log(`Next cursor: ${page.pagination.next_cursor ?? "none"}`);

  // 7. Export conversations
  console.log("\nExporting conversations...");
  const exported = await client.exportConversations([conv.id]);
  console.log(`Exported ${exported.count} conversation(s)`);

  // 8. Update conversation metadata
  console.log("\nUpdating conversation metadata...");
  const updated = await client.updateConversation(conv.id, {
    metadata: { demo: true, timestamp: new Date().toISOString() },
  });
  console.log(`Metadata: ${JSON.stringify(updated.metadata)}`);

  // 9. Look up by external ID (create a new one with external_id to demonstrate)
  console.log("\nCreating conversation with external ID...");
  const withExternal = await client.createConversation({
    external_id: "example-session-001",
    messages: [{ role: "user", content: "Lookup by external ID" }],
  });
  const fetched = await client.getConversationByExternalId("example-session-001");
  console.log(`Fetched by external_id: ${fetched.id === withExternal.id}`);

  // 10. Delete conversations (cleanup)
  console.log("\nDeleting conversations...");
  await client.deleteConversation(conv.id);
  await client.deleteConversation(withExternal.id);
  console.log("Deleted");

  console.log("\nExample completed successfully!");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

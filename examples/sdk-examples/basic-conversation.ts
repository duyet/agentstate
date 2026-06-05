import { AgentState } from "@agentstate/sdk";

/**
 * Basic Conversation Management Example
 *
 * This example demonstrates:
 * 1. Creating a conversation
 * 2. Adding messages
 * 3. Generating an AI title
 * 4. Deleting the conversation
 */

const client = new AgentState({
  apiKey: process.env.AGENTSTATE_API_KEY || "your-api-key-here",
  baseUrl: "https://agentstate.app/api",
});

async function main() {
  console.log("🚀 AgentState SDK Basic Conversation Example\n");

  // 1. Create conversation with messages
  console.log("Creating conversation...");
  const conv = await client.createConversation({
    title: "Test Conversation",
    messages: [
      {
        role: "user",
        content: "What is AgentState?",
      },
      {
        role: "assistant",
        content: "AgentState is a conversation history database-as-a-service for AI agents.",
      },
    ],
  });

  console.log(`✅ Created: ${conv.id}`);
  console.log(`🌐 View at: https://agentstate.app/d/${conv.id}`);

  // 2. Add more messages
  console.log("\nAdding messages...");
  await client.appendMessages(conv.id, [
    {
      role: "user",
      content: "Can you tell me more about the API?",
    },
  ]);

  console.log("✅ Messages added");

  // 3. Get full conversation
  console.log("\nFetching full conversation...");
  const full = await client.getConversation(conv.id);
  console.log(`Total messages: ${full.messages.length}`);
  console.log(`Messages:`, full.messages.map((m) => m.role).join(" → "));

  // 4. AI-generated title
  console.log("\nGenerating AI title...");
  const { title } = await client.generateTitle(conv.id);
  console.log(`🎓 AI Title: ${title}`);

  // 5. List conversations
  console.log("\nListing conversations...");
  const all = await client.listConversations({ limit: 10 });
  console.log(`Found ${all.data.length} conversations`);

  // 6. Export conversations
  console.log("\nExporting conversations...");
  const exported = await client.exportConversations();
  console.log(`Exported ${exported.count} conversations`);

  // 7. Update conversation metadata
  console.log("\nUpdating conversation metadata...");
  await client.updateConversation(conv.id, {
    metadata: {
      demo: true,
      timestamp: new Date().toISOString(),
    },
  });

  // 8. Get updated conversation
  const updated = await client.getConversation(conv.id);
  console.log(`Metadata:`, updated.metadata);

  // 9. Delete conversation (cleanup)
  console.log("\nDeleting conversation...");
  await client.deleteConversation(conv.id);
  console.log("🗑️  Conversation deleted");

  console.log("\n✨ Example completed successfully!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
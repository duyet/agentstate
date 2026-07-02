import { CodeBlock } from "@/components/brand/code-block";

const QUICK_START_SNIPPET = `curl -X POST https://agentstate.app/api/v1/conversations \\
  -H "Authorization: Bearer <your-key>" \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'`;

export function _QuickStartCode() {
  return (
    <div className="flex flex-col gap-element">
      <h3 className="text-[15px] text-fg">Quick start</h3>
      <CodeBlock code={QUICK_START_SNIPPET} title="terminal" />
    </div>
  );
}

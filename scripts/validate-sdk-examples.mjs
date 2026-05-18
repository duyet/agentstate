#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = mkdtempSync(join(tmpdir(), "agentstate-sdk-examples-"));

const tsExamples = [
  "examples/ai-sdk-ui/README.md",
  "examples/ai-sdk-rsc/README.md",
  "examples/langgraph-js/README.md",
];
const pythonExample = "examples/langgraph-python/README.md";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });

  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`Command failed: ${command} ${args.join(" ")}\n${output}`);
  }

  return result;
}

function extractCodeBlocks(filePath, languages) {
  const markdown = readFileSync(join(root, filePath), "utf8");
  const blocks = [];
  const pattern = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let match = pattern.exec(markdown);

  while (match !== null) {
    const language = match[1].toLowerCase();
    if (languages.includes(language)) {
      blocks.push({ code: match[2].trim(), language });
    }
    match = pattern.exec(markdown);
  }

  if (blocks.length === 0) {
    throw new Error(`No ${languages.join("/")} code blocks found in ${filePath}`);
  }

  return blocks;
}

function importPath(fromFile, target) {
  const withoutExtension = target.replace(/\.ts$/, "");
  const specifier = relative(dirname(fromFile), withoutExtension).replaceAll("\\", "/");
  return specifier.startsWith(".") ? specifier : `./${specifier}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteSdkImports(block, targetFile) {
  const replacements = {
    "@agentstate/sdk": join(root, "packages", "sdk", "src", "index.ts"),
    "@agentstate/sdk/ai-sdk": join(root, "packages", "sdk", "src", "ai-sdk.ts"),
    "@agentstate/sdk/langgraph": join(root, "packages", "sdk", "src", "langgraph.ts"),
  };

  let rewritten = block;
  for (const [source, target] of Object.entries(replacements)) {
    const pattern = new RegExp(`from\\s+(['"])${escapeRegExp(source)}\\1`, "g");
    rewritten = rewritten.replace(pattern, `from "${importPath(targetFile, target)}"`);
  }

  return rewritten;
}

function shouldUseTsxExtension(block) {
  if (block.language === "tsx") return true;
  return block.language === "typescript" && /<[A-Za-z][\s\S]*>/.test(block.code);
}

function validateTypeScriptExamples() {
  const files = [];
  for (const examplePath of tsExamples) {
    const blocks = extractCodeBlocks(examplePath, ["ts", "tsx", "typescript"]);
    blocks.forEach((block, index) => {
      const extension = shouldUseTsxExtension(block) ? "tsx" : "ts";
      const fileName = `${examplePath.replaceAll("/", "__")}__${index + 1}.${extension}`;
      const fullPath = join(tempDir, fileName);
      const rewrittenBlock = rewriteSdkImports(block.code, fullPath);
      writeFileSync(
        fullPath,
        [
          "declare const process: { env: Record<string, string | undefined> };",
          rewrittenBlock,
          "",
        ].join("\n"),
      );
      files.push(fileName);
    });
  }

  writeFileSync(
    join(tempDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "ES2022",
          moduleResolution: "bundler",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          jsx: "react-jsx",
          lib: ["ES2022", "DOM"],
          types: [],
        },
        include: files,
      },
      null,
      2,
    ),
  );

  run("bunx", ["tsc", "--project", join(tempDir, "tsconfig.json")]);
}

function pythonCommand() {
  const candidates = [process.env.PYTHON, "python", "python3"].filter(Boolean);
  for (const candidate of new Set(candidates)) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8", stdio: "pipe" });
    if (result.status === 0) return candidate;
  }

  throw new Error("Could not find a Python interpreter. Set PYTHON or install python/python3.");
}

function validatePythonExample() {
  const blocks = extractCodeBlocks(pythonExample, ["python", "py"]);

  blocks.forEach((block, index) => {
    const fullPath = join(tempDir, `langgraph-python-${index + 1}.py`);
    writeFileSync(fullPath, `${block.code}\n`);
    run(pythonCommand(), ["-m", "py_compile", fullPath], {
      env: {
        ...process.env,
        PYTHONPATH: [join(root, "packages", "python-sdk"), process.env.PYTHONPATH]
          .filter(Boolean)
          .join(delimiter),
      },
    });
  });

  run(
    pythonCommand(),
    [
      "-c",
      [
        "import agentstate",
        "from agentstate.langgraph import AgentStateCheckpointSaver, AsyncAgentStateCheckpointSaver",
      ].join("; "),
    ],
    {
      env: {
        ...process.env,
        PYTHONPATH: [join(root, "packages", "python-sdk"), process.env.PYTHONPATH]
          .filter(Boolean)
          .join(delimiter),
      },
    },
  );
}

try {
  validateTypeScriptExamples();
  validatePythonExample();
  console.log("SDK examples validated");
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

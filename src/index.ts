/**
 * AI Agent with OpenAI tool calls, verified by @nxtlinq/attest.
 * 僅執行 manifest scope 內宣告的 tools，否則拒絕並回報錯誤。
 */
import "dotenv/config";
import { isToolInAttestScope } from "@nxtlinq/attest";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get the current weather for a given city.",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name, e.g. Taipei" },
        },
        required: ["city"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_time",
      description: "Get the current local time in a given timezone.",
      parameters: {
        type: "object",
        properties: {
          timezone: { type: "string", description: "IANA timezone, e.g. Asia/Taipei" },
        },
        required: ["timezone"],
      },
    },
  },
];

async function runTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  if (!isToolInAttestScope(name)) {
    return `[Attest] Tool "${name}" is not in attested scope. Refused.`;
  }
  switch (name) {
    case "get_weather": {
      const city = String(args.city ?? "Unknown");
      return JSON.stringify({ city, temp: "22°C", condition: "Sunny" });
    }
    case "get_time": {
      const tz = String(args.timezone ?? "UTC");
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        dateStyle: "full",
        timeStyle: "long",
      });
      return JSON.stringify({ timezone: tz, time: formatter.format(now) });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Missing OPENAI_API_KEY. Copy .env.example to .env and set it.");
    process.exit(1);
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "user",
      content: "What's the weather in Taipei and the current time in Asia/Taipei?",
    },
  ];

  console.log("Calling OpenAI with tool support...\n");
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages,
    tools,
    tool_choice: "auto",
  });

  const choice = completion.choices[0];
  if (!choice?.message) {
    console.log("No response.");
    return;
  }

  let currentMessage = choice.message;
  messages.push(currentMessage);

  while (currentMessage.tool_calls && currentMessage.tool_calls.length > 0) {
    for (const tc of currentMessage.tool_calls) {
      const name = tc.function.name;
      const args = JSON.parse(tc.function.arguments ?? "{}") as Record<string, unknown>;
      console.log(`Tool call: ${name}(${JSON.stringify(args)})`);
      const result = await runTool(name, args);
      console.log(`Result: ${result}\n`);
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: result,
      });
    }
    const next = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });
    const nextChoice = next.choices[0]?.message;
    if (!nextChoice) break;
    currentMessage = nextChoice;
    messages.push(currentMessage);
  }

  if (currentMessage.content) {
    console.log("Assistant:", currentMessage.content);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

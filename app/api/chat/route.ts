import { z } from "zod";

import { LlamaService } from "@/services/llama";
import { ConversationInteraction, LlamaChatSession } from "node-llama-cpp";

const bodySchema = z.object({
  messages: z.array(
    z.object({ 
      text: z.string(), 
      system: z.boolean() 
    })
  ),
});

export async function POST(req: Request) {
  // const parsedBody = await bodySchema.safeParseAsync(body);
  // if (!parsedBody.success) {
  //   return Response.json({ success: false }, { status: 400 })
  // }
  if (!LlamaService.getContext()) {
    LlamaService.register();
  }

  type BodyType = z.infer<typeof bodySchema>;

  const body: BodyType = await req.json();
  
  const conversationHistory: ConversationInteraction[] = [];
  
  
  let current: ConversationInteraction = { prompt: "", response: "" };
  body.messages?.forEach((msg)  => {
    if (!msg.system) {
      current = {
        prompt: msg.text,
        response: "",
      };
    } else {
      current.response = msg.text;
      conversationHistory.push(current);
    }
  });

  const session = new LlamaChatSession({
    context: LlamaService.getContext(),
    conversationHistory,
  });

  if (current.prompt && !current.response) {
    const stream = new ReadableStream({
      async pull(controller) {
        await session.prompt(current.prompt, { 
          onToken(token) {
            controller.enqueue(session.context.decode(token));
          }
        });

        controller.close();
      }
    });
    return new Response(stream);
  } else {
    return new Response("No prompt found", { status: 400 });
  }
}

export const runtime = "nodejs";

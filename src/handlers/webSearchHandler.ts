import { z } from "zod";
import type { LoadModuleFunction, ToolResult } from "./../types";

// Define the Zod schema for web search arguments
export const WebSearchArgsSchema = z.object({
  query: z.string().min(1),
});

// Define the argument type from the schema
type WebSearchArgs = z.infer<typeof WebSearchArgsSchema>;

export async function handleWebSearch(
  args: WebSearchArgs,
  loadModule: LoadModuleFunction
): Promise<ToolResult> {
  try {
    const webSearchModule = await loadModule('webSearch');
    const result = await webSearchModule.webSearch(args.query);
    
    return {
      content: [{
        type: "text",
        text: result.results.length > 0 ? 
          `Found ${result.results.length} results for "${args.query}". ${result.results.map(r => `[${r.displayUrl}] ${r.title} - ${r.snippet} \n content: ${r.content}`).join("\n")}` : 
          `No results found for "${args.query}".`
      }],
      isError: false
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Error performing web search: ${error instanceof Error ? error.message : String(error)}`
      }],
      isError: true
    };
  }
}

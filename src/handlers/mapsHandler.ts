import { z } from "zod";
import type { LoadModuleFunction, ToolResult } from "./../types";
import { runAppleScript } from "run-applescript";
import * as path from "path";
import * as fs from "fs";

// Define the Zod schema for maps arguments
export const MapsArgsSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("search"),
    query: z.string().min(1),
    limit: z.number().optional(),
  }),
  z.object({
    operation: z.literal("save"),
    name: z.string().min(1),
    address: z.string().min(1),
  }),
  z.object({
    operation: z.literal("pin"),
    name: z.string().min(1),
    address: z.string().min(1),
  }),
  z.object({
    operation: z.literal("directions"),
    fromAddress: z.string().min(1),
    toAddress: z.string().min(1),
    transportType: z.enum(["driving", "walking", "transit"]).optional(),
  }),
  z.object({ operation: z.literal("listGuides") }),
  z.object({
    operation: z.literal("addToGuide"),
    address: z.string().min(1),
    guideName: z.string().min(1),
  }),
  z.object({
    operation: z.literal("createGuide"),
    guideName: z.string().min(1),
  }),
  z.object({ operation: z.literal("getCenter") }),
  z.object({
    operation: z.literal("setCenter"),
    latitude: z.number(),
    longitude: z.number(),
  }),
]);

// Define the argument type from the schema
type MapsArgs = z.infer<typeof MapsArgsSchema>;

interface SearchResponse {
  success: boolean;
  message?: string;
  locations: {
    name: string;
    address: string;
    latitude?: number;
    longitude?: number;
    category?: string;
  }[];
}

interface DirectionsResponse {
  success: boolean;
  message?: string;
  route?: {
    startAddress: string;
    endAddress: string;
    distance: string;
    duration: string;
  };
}

interface ListGuidesResponse {
  success: boolean;
  message?: string;
  guides?: {
    name: string;
    itemCount: number;
  }[];
}

interface GuideManipulationResponse {
  success: boolean;
  message?: string;
  guideName?: string;
  location?: string;
  locationName?: string;
}

interface CenterResponse {
  success: boolean;
  message?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Resolve the path to an AppleScript file
 * @param scriptName Name of the script file
 * @returns Absolute path to the script file
 */
function resolveScriptPath(scriptName: string): string {
  // Script name mappings for known scripts
  const scriptMappings: Record<string, string> = {
    'maps_get_center.scpt': 'getMapCenterCoordinates.applescript',
    'maps_set_center.scpt': 'setMapCenterCoordinates.applescript'
  };
  
  // Apply mapping if applicable
  const actualScriptName = scriptMappings[scriptName] || scriptName;
  
  // Try different possible locations for the scripts
  const possiblePaths = [
    // Specific project path (most likely to work)
    path.join('/Users/zach/Dev/MCP/apple/src/scripts', actualScriptName),
    // Absolute path option
    path.resolve(`./scripts/${actualScriptName}`),
    // Relative path from current directory
    path.join(process.cwd(), 'scripts', actualScriptName),
    // Relative path from parent directory
    path.join(process.cwd(), '..', 'scripts', actualScriptName),
    // Direct script name if it's in the PATH
    actualScriptName
  ];

  // Find the first path that exists
  for (const scriptPath of possiblePaths) {
    if (fs.existsSync(scriptPath)) {
      console.log(`Found script at: ${scriptPath}`);
      return scriptPath;
    }
  }

  // Log all the paths we tried for debugging
  console.error(`Could not find script: ${scriptName}. Tried paths:`, possiblePaths);
  
  // If no valid path is found, return the likely path
  return path.join('/Users/zach/Dev/MCP/apple/src/scripts', actualScriptName);
}

/**
 * Run an AppleScript with proper error handling
 * @param scriptName Name of the script file
 * @param args Arguments to pass to the script
 * @returns Result of the script execution
 */
async function runAppleScriptSafely(scriptName: string, args: string[] = []): Promise<string> {
  try {
    // Skip path resolution if full path provided
    const scriptPath = scriptName.includes('/') ? scriptName : resolveScriptPath(scriptName);
    
    // Build the osascript command with proper escaping for all arguments
    const escapedArgs = args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ');
    
    // Check if this is an AppleScript file
    if (scriptPath.endsWith('.applescript') || scriptPath.endsWith('.scpt')) {
      // For script files, use direct approach
      console.log(`Executing AppleScript file: ${scriptPath}`);
      // Use the script file directly with osascript
      return await runAppleScript(`osascript "${scriptPath}" ${escapedArgs}`);
    } else {
      // Original approach for non-file scripts
      const command = `${scriptPath} ${escapedArgs}`;
      console.log(`Executing AppleScript: osascript -e ${command}`);
      return await runAppleScript(command);
    }
  } catch (error) {
    // Enhance error message with more context
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to execute AppleScript ${scriptName}: ${errorMessage}`);
  }
}

export async function handleMaps(
  args: MapsArgs,
  loadModule: LoadModuleFunction
): Promise<ToolResult> {
  try {
    const mapsModule = await loadModule("maps");

    switch (args.operation) {
      case "search": {
        const resultStr = await runAppleScriptSafely(
          "maps_search.scpt",
          [args.query]
        );
        const parsedResult: SearchResponse = JSON.parse(resultStr);

        let detailedText = parsedResult.message || "Search completed";

        if (parsedResult.locations && parsedResult.locations.length > 0) {
          detailedText += "\n\n";
          parsedResult.locations.forEach((location: any, index: number) => {
            detailedText += `Location ${index + 1}:\n`;
            detailedText += `• Name: ${location.name}\n`;
            detailedText += `• Address: ${location.address}\n`;

            if (location.latitude !== null && location.longitude !== null) {
              detailedText += `• Coordinates: ${location.latitude.toFixed(
                6
              )}, ${location.longitude.toFixed(6)}\n`;
            }

            if (location.category) {
              detailedText += `• Category: ${location.category}\n`;
            }

            if (index < parsedResult.locations.length - 1) {
              detailedText += "\n";
            }
          });
        }

        return {
          content: [
            {
              type: "text",
              text: detailedText,
            },
          ],
          success: parsedResult.success,
          locations: parsedResult.locations,
          query: args.query,
          limit: args.limit,
          isError: !parsedResult.success,
        };
      }

      case "save": {
        const resultStr = await runAppleScriptSafely(
          "maps_save.scpt",
          [args.name, args.address]
        );
        const parsedResult: any = JSON.parse(resultStr);
        if (parsedResult.guides && Array.isArray(parsedResult.guides) && parsedResult.guides.length > 0) {
          return {
            content: [{ type: "text", text: parsedResult.message || "Save operation completed" }],
            success: parsedResult.success,
            location: parsedResult.location,
            name: args.name,
            address: args.address,
            isError: !parsedResult.success,
          };
        }

        return {
          content: [],
          success: parsedResult.success,
          location: parsedResult.location,
          name: args.name,
          address: args.address,
          isError: !parsedResult.success,
        };
      }

      case "pin": {
        const resultStr = await runAppleScriptSafely(
          "maps_pin.scpt",
          [args.name, args.address]
        );
        const parsedResult: any = JSON.parse(resultStr);
        if (parsedResult.guides && Array.isArray(parsedResult.guides) && parsedResult.guides.length > 0) {
          return {
            content: [{ type: "text", text: parsedResult.message || "Pin operation completed" }],
            success: parsedResult.success,
            location: parsedResult.location,
            name: args.name,
            address: args.address,
            isError: !parsedResult.success,
          };
        } else {
          return {
            content: [],
            success: parsedResult.success,
            location: parsedResult.location,
            name: args.name,
            address: args.address,
            isError: !parsedResult.success,
          };
        }
      }

      case "directions": {
        const resultStr = await runAppleScriptSafely(
          "maps_directions.scpt",
          [args.fromAddress, args.toAddress, args.transportType || "driving"]
        );
        const parsedResult: DirectionsResponse = JSON.parse(resultStr);

        let detailedText =
          parsedResult.message || "Directions request completed";

        if (parsedResult.success && parsedResult.route) {
          detailedText += "\n\n";
          detailedText += `• From: ${parsedResult.route.startAddress}\n`;
          detailedText += `• To: ${parsedResult.route.endAddress}\n`;
          detailedText += `• Distance: ${parsedResult.route.distance}\n`;
          detailedText += `• Duration: ${parsedResult.route.duration}\n`;
          detailedText += `• Transport Type: ${
            args.transportType || "driving"
          }\n`;
        }

        return {
          content: [{ type: "text", text: detailedText }],
          success: parsedResult.success,
          route: parsedResult.route,
          fromAddress: args.fromAddress,
          toAddress: args.toAddress,
          transportType: args.transportType || "driving",
          isError: !parsedResult.success,
        };
      }

      case "listGuides": {
        const resultStr = await runAppleScriptSafely(
          "maps_list_guides.scpt"
        );
        const parsedResult: ListGuidesResponse = JSON.parse(resultStr);

        let detailedText = parsedResult.message || "Guide listing completed";

        if (parsedResult.success && parsedResult.guides && Array.isArray(parsedResult.guides) && parsedResult.guides.length > 0) {
          detailedText += "\n\n";
          detailedText += "Available guides:\n";
          parsedResult.guides.forEach((guide: any, index: number) => {
            detailedText += `${index + 1}. ${guide.name} (${
              guide.itemCount
            } items)\n`;
          });
        }

        return {
          content: [{ type: "text", text: detailedText }],
          success: parsedResult.success,
          guides: parsedResult.guides,
          isError: !parsedResult.success,
        };
      }

      case "addToGuide": {
        const resultStr = await runAppleScriptSafely(
          "maps_add_to_guide.scpt",
          [args.address, args.guideName]
        );
        const parsedResult: GuideManipulationResponse = JSON.parse(resultStr);
        return {
          content: [{ type: "text", text: parsedResult.message || "Add to guide operation completed" }],
          success: parsedResult.success,
          guideName: parsedResult.guideName || args.guideName,
          locationName: parsedResult.locationName,
          address: args.address,
          isError: !parsedResult.success,
        };
      }

      case "createGuide": {
        const resultStr = await runAppleScriptSafely(
          "maps_create_guide.scpt",
          [args.guideName]
        );
        const parsedResult: GuideManipulationResponse = JSON.parse(resultStr);

        return {
          content: [{ type: "text", text: parsedResult.message || "Create guide operation completed" }],
          success: parsedResult.success,
          guideName: parsedResult.guideName || args.guideName,
          isError: !parsedResult.success,
        };
      }

      case "getCenter": {
        // Use the correct script filename
        const resultStr = await runAppleScriptSafely(
          "/Users/zach/Dev/MCP/apple/src/scripts/getMapCenterCoordinates.applescript"
        );
        const parsedResult: CenterResponse = JSON.parse(resultStr);

        let detailedText =
          parsedResult.message || "Get center operation completed";

        if (
          parsedResult.success &&
          parsedResult.latitude !== undefined &&
          parsedResult.longitude !== undefined
        ) {
          detailedText += "\n\n";
          detailedText += `• Latitude: ${parsedResult.latitude.toFixed(6)}\n`;
          detailedText += `• Longitude: ${parsedResult.longitude.toFixed(6)}\n`;
          detailedText += `• Google Maps Link: https://www.google.com/maps?q=${parsedResult.latitude},${parsedResult.longitude}`;
        }

        return {
          content: [
            {
              type: "text",
              text: detailedText,
            },
          ],
          success: parsedResult.success,
          latitude: parsedResult.latitude,
          longitude: parsedResult.longitude,
          isError: !parsedResult.success,
        };
      }

      case "setCenter": {
        // Convert numbers to strings and make sure they're properly formatted
        const latitudeStr = String(args.latitude);
        const longitudeStr = String(args.longitude);
        
        const resultStr = await runAppleScriptSafely(
          "/Users/zach/Dev/MCP/apple/src/scripts/setMapCenterCoordinates.applescript",
          [latitudeStr, longitudeStr]
        );
        const parsedResult: CenterResponse = JSON.parse(resultStr);

        let detailedText =
          parsedResult.message || "Set center operation completed";

        if (parsedResult.success) {
          detailedText += "\n\n";
          detailedText += `• Latitude: ${args.latitude.toFixed(6)}\n`;
          detailedText += `• Longitude: ${args.longitude.toFixed(6)}\n`;
          detailedText += `• Google Maps Link: https://www.google.com/maps?q=${args.latitude},${args.longitude}`;
        }

        return {
          content: [
            {
              type: "text",
              text: detailedText,
            },
          ],
          success: parsedResult.success,
          latitude: args.latitude,
          longitude: args.longitude,
          isError: !parsedResult.success,
        };
      }

      default:
        throw new Error(`Unknown maps operation: ${(args as any).operation}`);
    }
  } catch (error) {
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if the error is related to script path
    let additionalInfo = "";
    if (errorMessage.includes("No such file or directory") || 
        errorMessage.includes("cannot find") || 
        errorMessage.includes("unknown token")) {
      additionalInfo = "\n\nPossible issues:\n" +
                      "- The AppleScript files may not be in the expected locations\n" +
                      "- The AppleScript files may not have correct permissions\n" +
                      "- The script execution syntax may need adjustment for your environment";
    }
    
    return {
      content: [
        {
          type: "text",
          text: `Error in maps tool: ${errorMessage}${additionalInfo}`,
        },
      ],
      isError: true,
    };
  }
}
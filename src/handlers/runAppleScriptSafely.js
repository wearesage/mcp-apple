/**
 * Run an AppleScript with proper error handling
 * @param scriptName Name of the script file
 * @param args Arguments to pass to the script
 * @returns Result of the script execution
 */
async function runAppleScriptSafely(scriptName, args = []) {
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

module.exports = runAppleScriptSafely;
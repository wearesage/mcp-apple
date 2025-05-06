on run argv
	set accessResult to false
	
	try
		-- Check if Maps app is running
		set isRunning to false
		tell application "System Events"
			set isRunning to exists process "Maps"
		end tell
		
		if not isRunning then
			-- Try to launch Maps
			tell application "Maps" to activate
			delay 1
		end if
		
		-- Try to get basic info from Maps to verify access
		tell application "Maps"
			-- Just try to get the name to test access
			set appName to name
			set accessResult to true
		end tell
	on error errMsg
		set accessResult to false
	end try
	
	return accessResult
end run
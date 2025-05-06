on run argv
	-- Expects fromAddress, toAddress, and optional transportType as arguments
	set fromAddress to item 1 of argv
	set toAddress to item 2 of argv
	set transportType to "driving" -- Default transport type
	
	if (count of argv) > 2 then
		set transportType to item 3 of argv
	end if
	
	set resultSuccess to false
	set resultMessage to "Unknown error occurred"
	set routeData to {}
	
	tell application "Maps"
		-- Make sure Maps is running and active
		activate
		
		try
			-- Ask for directions
			get directions from fromAddress to toAddress by transportType
			
			-- Wait for directions to load
			delay 2
			
			-- There's no direct API to get the route details
			-- We'll return basic success and let the Maps UI show the route
			set resultSuccess to true
			set resultMessage to "Displaying directions from \"" & fromAddress & "\" to \"" & toAddress & "\" by " & transportType
			
			-- Create basic route data
			set routeData to {distance:"See Maps app for details", duration:"See Maps app for details", startAddress:fromAddress, endAddress:toAddress}
		on error errMsg
			set resultSuccess to false
			set resultMessage to "Error getting directions: " & errMsg
		end try
	end tell
	
	-- Return result as a record
	return {success:resultSuccess, message:resultMessage, route:routeData}
end run
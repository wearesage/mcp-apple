on run argv
	set resultSuccess to false
	set resultMessage to "Unknown error occurred"
	set centerLatitude to 0
	set centerLongitude to 0
	
	-- First, ensure Maps is open with a valid view by searching for a known location
	-- This helps initialize the app properly before attempting to get coordinates
	try
		tell application "System Events"
			-- Make sure Maps is running and active
			tell application "Maps" to activate
			
			-- Wait for Maps to fully activate
			delay 1
			
			-- Search for a known location to ensure map is in a valid state
			-- Using URL scheme which is more reliable than direct API calls
			open location "maps://?q=San%20Francisco"
			
			-- Wait for the search to complete
			delay 2
		end tell
	on error initError
		-- Failed to initialize Maps, but continue anyway
		-- The main attempt might still work
	end try
	
	-- Now try to get the center coordinates
	tell application "Maps"
		try
			-- Ensure there's a window and a map view
			if (count of windows) = 0 then
				error "No Maps windows found. Please ensure Maps is open with a map view."
			end if
			
			-- Try to get the center coordinates
			set centerCoords to {}
			
			-- Try different approaches to get the center coordinates
			try
				-- Approach 1: Try to get the center property directly
				set centerCoords to center of map view of window 1
			on error centerError1
				try
					-- Approach 2: Try to get the visible region and calculate center
					set visibleRegion to visible region of map view of window 1
					
					if visibleRegion is not missing value then
						set northLat to north latitude of visibleRegion
						set southLat to south latitude of visibleRegion
						set eastLng to east longitude of visibleRegion
						set westLng to west longitude of visibleRegion
						
						set centerLatitude to (northLat + southLat) / 2
						set centerLongitude to (eastLng + westLng) / 2
						set centerCoords to {centerLatitude, centerLongitude}
					else
						error "No visible region available"
					end if
				on error centerError2
					-- All methods failed
					error "Failed to get center coordinates: " & centerError1 & " / " & centerError2
				end try
			end try
			
			-- Check if we got valid coordinates
			if (count of centerCoords) = 2 then
				set centerLatitude to item 1 of centerCoords
				set centerLongitude to item 2 of centerCoords
				
				set resultSuccess to true
				set resultMessage to "Map center coordinates retrieved."
			else
				error "Could not retrieve valid map center coordinates."
			end if
		on error errMsg
			set resultSuccess to false
			set resultMessage to "Error getting map center: " & errMsg & ". Please ensure Maps is open and showing a map."
		end try
	end tell
	
	-- Return result as a record
	return {success:resultSuccess, message:resultMessage, latitude:centerLatitude, longitude:centerLongitude}
end run
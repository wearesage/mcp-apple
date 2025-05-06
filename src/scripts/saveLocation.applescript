on run argv
	-- Expects name and address as arguments
	set locationName to item 1 of argv
	set locationAddress to item 2 of argv
	
	set resultSuccess to false
	set resultMessage to "Unknown error occurred"
	set locationData to {}
	
	tell application "Maps"
		-- Make sure Maps is running and active
		activate
		
		-- First search for the location to get its details
		search locationAddress
		
		-- Wait for search to complete
		delay 2
		
		try
			-- Try to get the current location
			set currentLocation to selected location
			
			if currentLocation is not missing value then
				-- Now try to add to favorites
				try
					-- Try to add to favorites
					add to favorites currentLocation with properties {name:locationName}
					
					-- Create location record for successful result
					set locationId to "loc-" & ((current date) as string)
					set locationAddress to formatted address of currentLocation
					set locationLatitude to latitude of currentLocation
					set locationLongitude to longitude of currentLocation
					
					set locationData to {id:locationId, name:locationName, address:locationAddress, latitude:locationLatitude, longitude:locationLongitude, category:"", isFavorite:true}
					
					set resultSuccess to true
					set resultMessage to "Added \"" & locationName & "\" to favorites"
				on error errMsg
					-- If direct API fails, provide instructions for manual saving
					set resultSuccess to false
					set resultMessage to "Location found but unable to automatically add to favorites. Please manually save \"" & locationName & "\" from the Maps app. Error: " & errMsg
				end try
			else
				set resultSuccess to false
				set resultMessage to "Could not find location for \"" & locationAddress & "\""
			end if
		on error errMsg
			set resultSuccess to false
			set resultMessage to "Error adding to favorites: " & errMsg
		end try
	end tell
	
	-- Return result as a record
	return {success:resultSuccess, message:resultMessage, location:locationData}
end run
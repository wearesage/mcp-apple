on run argv
	-- Expects name and address as arguments
	set pinName to item 1 of argv
	set pinAddress to item 2 of argv
	
	set resultSuccess to false
	set resultMessage to "Unknown error occurred"
	set locationData to {}
	
	tell application "Maps"
		-- Make sure Maps is running and active
		activate
		
		try
			-- First search for the location to get its details
			search pinAddress
			
			-- Wait for search to complete
			delay 2
			
			-- Dropping pins programmatically is challenging in newer Maps versions
			-- Most reliable way is to search and then provide instructions for manual pin dropping
			
			-- Try to get the current location for the result data
			try
				set currentLocation to selected location
				
				if currentLocation is not missing value then
					-- Create location record for the result
					set locationId to "loc-" & ((current date) as string)
					set locationAddress to formatted address of currentLocation
					set locationLatitude to latitude of currentLocation
					set locationLongitude to longitude of currentLocation
					
					set locationData to {id:locationId, name:pinName, address:locationAddress, latitude:locationLatitude, longitude:locationLongitude, category:"", isFavorite:false}
				end if
			end try
			
			set resultSuccess to true
			set resultMessage to "Showing \"" & pinAddress & "\" in Maps. You can now manually drop a pin by right-clicking and selecting \"Drop Pin\"."
		on error errMsg
			set resultSuccess to false
			set resultMessage to "Error dropping pin: " & errMsg
		end try
	end tell
	
	-- Return result as a record
	return {success:resultSuccess, message:resultMessage, location:locationData}
end run
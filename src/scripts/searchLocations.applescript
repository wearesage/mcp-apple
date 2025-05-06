on run argv
	-- Expects query and optional limit as arguments
	set searchQuery to item 1 of argv
	set resultLimit to 5 -- Default limit
	
	if (count of argv) > 1 then
		try
			set resultLimit to (item 2 of argv) as integer
		on error
			set resultLimit to 5 -- Default if conversion fails
		end try
	end if
	
	set resultList to {}
	
	tell application "Maps"
		-- Make sure Maps is running and active
		activate
		
		-- Execute search using the URL scheme which is more reliable
		tell application "System Events"
			-- Encode the query for URL
			set encodedQuery to searchQuery
			set encodedQuery to my encodeText(encodedQuery)
			
			-- Check if query contains "near" to handle special case
			set queryLower to my toLowerCase(searchQuery)
			set nearIndex to offset of " near " in queryLower
			
			set mapUrl to ""
			if nearIndex > 0 then
				-- Found "near", split into category and location
				set category to text 1 thru (nearIndex - 1) of searchQuery
				set location to text (nearIndex + 6) thru (length of searchQuery) of searchQuery
				set encodedCategory to my encodeText(category)
				set encodedLocation to my encodeText(location)
				set mapUrl to "maps://?q=" & encodedCategory & "&near=" & encodedLocation
			else
				-- No "near", use the standard query format
				set mapUrl to "maps://?q=" & encodedQuery
			end if
			
			-- Open the URL in Maps
			tell application "Maps" to open location mapUrl
			
			-- Also try the standard search method as fallback
			try
				tell application "Maps" to search searchQuery
			end try
			
			-- Wait for search results to populate
			delay 2
		end tell
		
		-- Try to get search results
		try
			-- Try to get the selected location
			set selectedLocation to selected location
			
			if selectedLocation is not missing value then
				-- If we have a selected location, use it
				set locationId to "loc-" & ((current date) as string) & "-" & (random number from 1000 to 9999)
				set locationName to name of selectedLocation
				set locationAddress to formatted address of selectedLocation
				set locationLatitude to latitude of selectedLocation
				set locationLongitude to longitude of selectedLocation
				
				-- Try to get category if available
				set locationCategory to ""
				try
					set locationCategory to category of selectedLocation
				on error
					set locationCategory to ""
				end try
				
				-- Create location record
				set locationRecord to {id:locationId, name:locationName, address:locationAddress, latitude:locationLatitude, longitude:locationLongitude, category:locationCategory, isFavorite:false}
				set end of resultList to locationRecord
			else
				-- If no selected location, use the search query as name
				set locationId to "loc-" & ((current date) as string) & "-" & (random number from 1000 to 9999)
				set locationRecord to {id:locationId, name:searchQuery, address:"Search results - address details not available", latitude:0, longitude:0, category:"", isFavorite:false}
				set end of resultList to locationRecord
			end if
		on error errMsg
			-- If the above didn't work, at least return something based on the query
			set locationId to "loc-" & ((current date) as string) & "-" & (random number from 1000 to 9999)
			set locationRecord to {id:locationId, name:searchQuery, address:"Search result - address details not available", latitude:0, longitude:0, category:"", isFavorite:false}
			set end of resultList to locationRecord
		end try
	end tell
	
	-- Limit the results
	if (count of resultList) > resultLimit then
		set resultList to items 1 thru resultLimit of resultList
	end if
	
	return resultList
end run

-- Helper function to encode text for URL
on encodeText(theText)
	set theTextEnc to ""
	repeat with eachChar in characters of theText
		set useChar to eachChar
		set eachCharNum to ASCII number of eachChar
		if eachCharNum = 32 then
			-- Convert space to +
			set useChar to "+"
		else if (eachCharNum ≥ 48 and eachCharNum ≤ 57) or (eachCharNum ≥ 65 and eachCharNum ≤ 90) or (eachCharNum ≥ 97 and eachCharNum ≤ 122) then
			-- Keep alphanumeric characters as is
		else
			-- Encode other characters
			set useChar to "%" & my toHex(eachCharNum)
		end if
		set theTextEnc to theTextEnc & useChar
	end repeat
	return theTextEnc
end encodeText

-- Helper function to convert to lowercase
on toLowerCase(theText)
	return do shell script "echo " & quoted form of theText & " | tr '[:upper:]' '[:lower:]'"
end toLowerCase

-- Helper function to convert number to hex
on toHex(theNum)
	set hexChars to "0123456789ABCDEF"
	set hexString to ""
	set theNum to theNum as integer
	repeat while theNum > 0
		set theRemainder to theNum mod 16
		set hexString to (character (theRemainder + 1) of hexChars) & hexString
		set theNum to theNum div 16
	end repeat
	if length of hexString < 2 then set hexString to "0" & hexString
	return hexString
end toHex
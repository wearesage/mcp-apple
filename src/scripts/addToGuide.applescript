on run argv
	-- Expects locationAddress and guideName as arguments
	set locationAddress to item 1 of argv
	set guideName to item 2 of argv
	
	set resultSuccess to false
	set resultMessage to "Unknown error occurred"
	
	tell application "System Events"
		try
			-- Make sure Maps is running and active
			tell application "Maps" to activate
			
			-- Wait for Maps to fully activate
			delay 1
			
			-- Search for the location
			set encodedAddress to my encodeText(locationAddress)
			open location "maps://?q=" & encodedAddress
			
			-- We can't directly add to a guide through AppleScript,
			-- but we can provide instructions for the user
			
			set resultSuccess to true
			set resultMessage to "Showing \"" & locationAddress & "\" in Maps. Add to \"" & guideName & "\" guide by clicking location pin, \"...\" button, then \"Add to Guide\"."
		on error errMsg
			set resultSuccess to false
			set resultMessage to "Error adding to guide: " & errMsg
		end try
	end tell
	
	-- Return result as a record
	return {success:resultSuccess, message:resultMessage, guideName:guideName, locationName:locationAddress}
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
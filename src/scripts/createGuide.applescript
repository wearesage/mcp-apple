on run argv
	-- Expects guideName as argument
	set guideName to item 1 of argv
	
	set resultSuccess to false
	set resultMessage to "Unknown error occurred"
	
	tell application "System Events"
		try
			-- Make sure Maps is running and active
			tell application "Maps" to activate
			
			-- Wait for Maps to fully activate
			delay 1
			
			-- Open the guides view using URL scheme
			open location "maps://?show=guides"
			
			-- We can't directly create a guide through AppleScript,
			-- but we can provide instructions for the user
			
			set resultSuccess to true
			set resultMessage to "Opened guides view to create new guide \"" & guideName & "\". Click \"+\" button and select \"New Guide\"."
		on error errMsg
			set resultSuccess to false
			set resultMessage to "Error creating guide: " & errMsg
		end try
	end tell
	
	-- Return result as a record
	return {success:resultSuccess, message:resultMessage, guideName:guideName}
end run
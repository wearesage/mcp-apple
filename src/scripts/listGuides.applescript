on run argv
	set resultSuccess to false
	set resultMessage to "Unknown error occurred"
	set guidesData to {}
	
	tell application "System Events"
		try
			-- Make sure Maps is running and active
			tell application "Maps" to activate
			
			-- Wait for Maps to fully activate
			delay 1
			
			-- Open the guides view using URL scheme
			open location "maps://?show=guides"
			
			-- Without direct scripting access, we can't get the actual list of guides
			-- But we can at least open the guides view for the user
			
			set resultSuccess to true
			set resultMessage to "Opened guides view in Maps"
			
			-- Since we can't directly access guides data, return an empty list
			set guidesData to {}
		on error errMsg
			set resultSuccess to false
			set resultMessage to "Error accessing guides: " & errMsg
		end try
	end tell
	
	-- Return result as a record
	return {success:resultSuccess, message:resultMessage, guides:guidesData}
end run
on run argv
	-- Expects latitude and longitude as arguments
	set latitudeStr to item 1 of argv
	set longitudeStr to item 2 of argv
	
	-- Convert string arguments to numbers
	set latitude to latitudeStr as number
	set longitude to longitudeStr as number
	
	set resultSuccess to false
	set resultMessage to "Unknown error occurred"
	
	-- Validate input coordinates
	if latitude < -90 or latitude > 90 then
		return {success:false, message:"Invalid latitude: " & latitude & ". Latitude must be between -90 and 90 degrees.", latitude:latitude, longitude:longitude}
	end if
	
	if longitude < -180 or longitude > 180 then
		return {success:false, message:"Invalid longitude: " & longitude & ". Longitude must be between -180 and 180 degrees.", latitude:latitude, longitude:longitude}
	end if
	
	tell application "System Events"
		try
			-- Make sure Maps is running and active
			tell application "Maps" to activate
			
			-- Wait for Maps to fully activate
			delay 1
			
			-- Use openLocation with ll parameter for reliability
			set mapUrl to "maps://?ll=" & latitude & "," & longitude
			open location mapUrl
			
			-- Wait longer for the map to update
			delay 2
			
			-- Try to verify the center was set by getting the current center
			set verificationMessage to ""
			
			try
				tell application "Maps"
					if (count of windows) > 0 then
						set currentCenter to center of map view of window 1
						
						if (count of currentCenter) = 2 then
							set currentLat to item 1 of currentCenter
							set currentLng to item 2 of currentCenter
							
							-- Check if we're reasonably close to the target (allowing for some precision differences)
							set latDiff to abs(currentLat - latitude)
							set lngDiff to abs(currentLng - longitude)
							
							if latDiff < 0.01 and lngDiff < 0.01 then
								set verificationMessage to " Verified center was set correctly."
							else
								set verificationMessage to " Note: Current center (" & (round (currentLat * 10000) / 10000) & ", " & (round (currentLng * 10000) / 10000) & ") differs from requested coordinates."
							end if
						end if
					end if
				end tell
			on error verifyError
				-- Verification attempt failed (non-critical)
				-- Verification is optional, so we continue even if it fails
			end try
			
			set resultSuccess to true
			set resultMessage to "Set map center to " & latitude & ", " & longitude & "." & verificationMessage
		on error errMsg
			set resultSuccess to false
			set resultMessage to "Error setting map center: " & errMsg
		end try
	end tell
	
	-- Return result as a record
	return {success:resultSuccess, message:resultMessage, latitude:latitude, longitude:longitude}
end run
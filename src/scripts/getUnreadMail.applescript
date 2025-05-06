on run argv
	-- Expects accountName, mailboxName (optional), limit (optional) as arguments
	set accountName to item 1 of argv
	set mailboxName to ""
	if (count of argv) > 1 then
		set mailboxName to item 2 of argv
	end if
	set msgLimit to 10
	if (count of argv) > 2 then
		try
			set msgLimit to (item 3 of argv) as integer
		on error
			set msgLimit to 10 -- Default if conversion fails
		end try
	end if

	tell application "Mail"
		set resultList to {}
		try
			set targetAccount to first account whose name is accountName
			
			-- Get mailboxes for this account
			set acctMailboxes to every mailbox of targetAccount
			
			-- If mailbox is specified, only search in that mailbox
			set mailboxesToSearch to acctMailboxes
			if mailboxName is not "" then
				set mailboxesToSearch to {}
				repeat with mb in acctMailboxes
					if name of mb is mailboxName then
						set mailboxesToSearch to {mb}
						exit repeat
					end if
				end repeat
			end if
			
			-- Search specified mailboxes
			repeat with mb in mailboxesToSearch
				try
					set unreadMessages to (messages of mb whose read status is false)
					if (count of unreadMessages) > 0 then
						if (count of unreadMessages) < msgLimit then
							set msgLimit to (count of unreadMessages)
						end if
						
						repeat with i from 1 to msgLimit
							try
								set currentMsg to item i of unreadMessages
								set msgData to {subject:(subject of currentMsg), sender:(sender of currentMsg), dateSent:(date sent of currentMsg) as string, mailboxName:(name of mb)}
								
								-- Try to get content if possible
								try
									set msgContent to content of currentMsg
									if length of msgContent > 500 then
										set msgContent to (text 1 thru 500 of msgContent) & "..."
									end if
									set msgData to msgData & {content:msgContent}
								on error
									set msgData to msgData & {content:"[Content not available]"}
								end try
								
								set end of resultList to msgData
							on error errMsgInner
								-- Skip problematic messages, maybe log errMsgInner somewhere if needed
							end try
						end repeat
						
						if (count of resultList) ≥ msgLimit then exit repeat -- Check against the potentially adjusted limit
					end if
				on error errMsgMid
					-- Skip problematic mailboxes, maybe log errMsgMid
				end try
			end repeat
		on error errMsgOuter
			return "Error: " & errMsgOuter
		end try
		
		return resultList
	end tell
end run

# Google-Calendar-One-Way-Sync

This script allows you to sync events between a source calendar and a target calendar in Google Calendar. It retrieves events from the source calendar, filters them based on certain criteria, and updates the target calendar accordingly. It cleans up stale events and delete target events based on specific conditions to ensure the target events always match what currently exists in the source.  I had issues reliably syncronizing recurring events, and the workaround i went with was to recreate each instance of recurring events as a single event in the target calendar.

I wrote this script for a use-case where a scheduling/booking software was only capable of syncronizing with one google calendar (two-way), and the user had a need to bring in another google calendar's events so that the scheduling software would pick them up and block off time for those other calendar's events as well.  This script only targets events in the target calendar with the `sourceCalendarNickname` in the title, so it should be possible to use this to bring multiple calendars into one, but that was not tested.

## Setup

To set up and use this script, follow these steps:

1. Open the script editor in your Google Sheets or create a new Google Apps Script project.
2. Copy and paste the provided script into the editor.
3. Replace the placeholder values with your own information:
   - `sourceCalendarId`: Replace with the ID of your source calendar (e.g., `'example-source-calendar@example.com'`).
   - `sourceCalendarNickname`: Replace with the text to place in brackets prepended to the event name in the target calendar.
   - `targetCalendarId`: Replace with the ID of your target calendar (e.g., `'example-target-calendar@example.com'`).
   - `daysBefore`: Set the number of days before today to sync events.
   - `daysAfter`: Set the number of days after today to sync events.
   - `targetCalendarCleanupName`: Replace with text to be searched for inside brackets in the titles of target events that should be deleted.  This is here, dormant, to be used whenever you want to remove all `[Old_Calendar_Name]` events.  For example, when changing the name.
   - `ignoredEventTitles`: Add event titles to ignore in an array format (e.g., `["SLEEP", "Dinner", "Snack", "Lunch"]`), these will not be sync'd to the target.
4. Save the script and authorize it to access your Google Calendar data.
5. Run the `main` function to sync the calendars and perform the specified actions.
6. Configure triggers to run the script on a schedule or when the calendar is changed.

Please note that you need to have appropriate access and permissions to the source and target calendars for the script to work correctly.

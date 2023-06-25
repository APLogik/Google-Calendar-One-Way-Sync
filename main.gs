function main() {
  var sourceCalendarId = 'example-source-calendar@example.com';  // Replace with the source calendar ID
  var sourceCalendarNickname = 'ExampleCalendar'; // Replace with text to place in brackets prepended to event name in target calendar
  var targetCalendarId = 'example-target-calendar@example.com';  // Replace with the target calendar ID
  var daysBefore = 7;  // Number of days before today to sync events
  var daysAfter = 90;   // Number of days after today to sync events
  var targetCalendarCleanupName = '';  // Replace with text here, without brackets, to be searched for inside brackets in the titles of target events, and those events will be deleted
  var ignoredEventTitles = ["SLEEP", "Dinner", "Snack", "Lunch"];  // This is an array, so you can add more than one event title to ignore, separated by commas like "one", "two"

  // Get the source and target calendars using their IDs
  var sourceCalendar = CalendarApp.getCalendarById(sourceCalendarId);
  var targetCalendar = CalendarApp.getCalendarById(targetCalendarId);
  
  // Calculate the start and end dates for event syncing
  var today = new Date();
  var startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysBefore);
  var endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + daysAfter + 1);  // Add 1 day for the end date
  
  // Get the events from the source and target calendars within the specified date range
  var sourceEvents = sourceCalendar.getEvents(startDate, endDate).filter(function(event) {
    return ignoredEventTitles.indexOf(event.getTitle()) === -1;
  });
  var targetEvents = targetCalendar.getEvents(startDate, endDate);
  // Call the addSourceEventID function to process and update the target events
  var updatedTargetEvents = addSourceEventID(targetEvents);

  Logger.log('** Starting Stale Event Cleanup **');
  staleEventCleanup(sourceEvents, updatedTargetEvents, targetCalendarId, sourceCalendarNickname);
  Logger.log('** Starting Target Calendar Cleanup **');
  targetCalendarCleanup(updatedTargetEvents, targetCalendarCleanupName);

  // Getting the events again, after cleanup, from the source and target calendars within the specified date range
  var sourceEvents = sourceCalendar.getEvents(startDate, endDate).filter(function(event) {
    return ignoredEventTitles.indexOf(event.getTitle()) === -1;
  });
  var targetEvents = targetCalendar.getEvents(startDate, endDate);
  // Call the addSourceEventID function to process and update the target events
  var updatedTargetEvents = addSourceEventID(targetEvents);

  Logger.log('** Adding New Single Events **');
  addNewSingleEvents(sourceEvents, updatedTargetEvents, targetCalendarId, sourceCalendar, sourceCalendarNickname);
  Logger.log('** Adding New Recurring Events **');
  addNewRecurringEvents(sourceEvents, updatedTargetEvents, targetCalendarId, sourceCalendar, sourceCalendarNickname);
}

/**
 * Adds the source event ID to target events based on their descriptions.
 *
 * @param {Array} targetEvents - The array of target event objects.
 * @returns {Array} - The updated array of target event objects.
 */
function addSourceEventID(targetEvents) {
  // Iterate through each targetEvent and check if the description contains "Source Event ID:"
  for (var i = 0; i < targetEvents.length; i++) {
    var targetEvent = targetEvents[i];
    var description = targetEvent.getDescription();

    if (description.indexOf("Source Event ID:") !== -1) {
      // The description contains "Source Event ID:", extract the source event ID
      var sourceEventId = description.split("Source Event ID:")[1].trim();
      // Add the source event ID as a property to the target event object
      targetEvent.sourceEventId = sourceEventId;
    }
  }

  // Return the updated event objects
  return targetEvents;
}

/**
 * Deletes events from the target calendar that match a specified name.
 * @param {Event[]} updatedTargetEvents - The array of updated events in the target calendar.
 * @param {string} targetCalendarCleanupName - The name used to filter events for deletion.
 */
function targetCalendarCleanup(updatedTargetEvents, targetCalendarCleanupName) {
  // Check if a target name is provided
  if (!targetCalendarCleanupName) {
    Logger.log('Skipping targetCalendarCleanup, no target given');
    return;
  }

  // Filter events to be deleted based on the target name
  var targetEventsToDelete = updatedTargetEvents.filter(function(event) {
    var title = event.getTitle();
    var regex = new RegExp('\\[' + targetCalendarCleanupName + '\\]', 'i');
    return regex.test(title);
  });

  // Delete each event from the target calendar
  for (var i = 0; i < targetEventsToDelete.length; i++) {
    var eventToDelete = targetEventsToDelete[i];
    Logger.log('Deleting ' + eventToDelete.getTitle());
    eventToDelete.deleteEvent();
  }
}

/**
 * Cleans up stale events in the target calendar based on the provided source events.
 *
 * @param {Array} sourceEvents - The array of source events to compare against.
 * @param {Array} updatedTargetEvents - The array of updated target events to check for staleness.
 * @param {string} sourceCalendarNickname - The nickname of the source calendar.
 */
function staleEventCleanup(sourceEvents, updatedTargetEvents, sourceCalendarNickname) {
  var staleEvents = [];

  // Iterate through each updatedTargetEvent
  for (var i = 0; i < updatedTargetEvents.length; i++) {
    var updatedTargetEvent = updatedTargetEvents[i];
    var foundMatchingSourceId = false;
    var foundMatchingDates = false;
    var foundSourceIdInDescription = true;
    var foundMatchingCalNameInTitle = true;

    // Check if the updatedTargetEvent has 'Source Event ID:' in the description
    if (updatedTargetEvent.getDescription().indexOf('Source Event ID:') !== -1) {
      var targetEventSourceId = updatedTargetEvent.sourceEventId;

      // Compare the source and target IDs and start/end times to generate a list of events to delete
      for (var j = 0; j < sourceEvents.length; j++) {
        var sourceEvent = sourceEvents[j];
        var sourceEventId = sourceEvent.getId();

        // Check if there is a matching source event ID
        if (sourceEventId === targetEventSourceId) {
          foundMatchingSourceId = true;
        }

        // Check if there are matching start and end times
        if (
          sourceEvent.getStartTime().getTime() === updatedTargetEvent.getStartTime().getTime() &&
          sourceEvent.getStartTime().toDateString() === updatedTargetEvent.getStartTime().toDateString() &&
          sourceEvent.getEndTime().getTime() === updatedTargetEvent.getEndTime().getTime() &&
          sourceEvent.getEndTime().toDateString() === updatedTargetEvent.getEndTime().toDateString()
        ) {
          foundMatchingDates = true;
          break;
        }
      }
    }

    // If the target event does not have 'Source Event ID:' in the description, it is a normal event in that calendar and should be ignored
    if (updatedTargetEvent.getDescription().indexOf('Source Event ID:') === -1) {
      foundSourceIdInDescription = false;
    }

    // If the target event does not have the specified nickname in the title, it is an event from a different calendar and should be ignored
    if (updatedTargetEvent.getTitle().match(/\[.*?\]/) !== null) {
      var title = updatedTargetEvent.getTitle();
      var regex = new RegExp('\\[' + sourceCalendarNickname + '\\]', 'i');
      if (regex.test(title)) {
        // The title contains the sourceCalendarNickname in square brackets
        foundMatchingCalNameInTitle = false;
      }
    } else {
      // If the event doesn't have square brackets at all, set to false
      foundMatchingCalNameInTitle = false;
    }

    // If the updatedTargetEvent is not found in sourceEvents or does not have 'Source Event ID:' in the description, add it to staleEvents
    if (!foundMatchingSourceId || !foundMatchingDates)  {
      // If Source ID is found in the description and the matching calendar name is found in the title, this is a relevant event to edit
      if (foundSourceIdInDescription && foundMatchingCalNameInTitle) {
        staleEvents.push(updatedTargetEvent);
        // Uncomment the next line for debugging purposes to understand why an event is being found as stale
        // Logger.log('Found Stale Event: ' + updatedTargetEvent.getTitle() + ' , ' + foundMatchingSourceId + foundMatchingDates + foundSourceIdInDescription + foundMatchingCalNameInTitle)
      }
    }
  }

  // Delete stale events from the target calendar
  for (var k = 0; k < staleEvents.length; k++) {
    var staleEvent = staleEvents[k];
    staleEvent.deleteEvent();
    Logger.log('Deleting Stale Event: ' + staleEvent.getTitle() + ' , ' + staleEvent.getId());
  }
}

/**
 * Adds new single events from the source calendar to the target calendar,
 * updating existing events if their times and titles don't match.
 *
 * @param {Event[]} sourceEvents - List of source events.
 * @param {Event[]} updatedTargetEvents - List of updated target events.
 * @param {string} targetCalendarId - ID of the target calendar.
 * @param {Calendar} sourceCalendar - Source calendar.
 * @param {string} sourceCalendarNickname - Nickname for the source calendar.
 */
function addNewSingleEvents(sourceEvents, updatedTargetEvents, targetCalendarId, sourceCalendar, sourceCalendarNickname) {
  // Create a list to store new single events
  var newSingleEvents = [];

  // Filter out recurring events from sourceEvents
  var filteredSourceEvents = sourceEvents.filter(function(event) {
    return !event.isRecurringEvent();
  });

  // Iterate through each filteredSourceEvent
  for (var i = 0; i < filteredSourceEvents.length; i++) {
    var filteredSourceEvent = filteredSourceEvents[i];
    var found = false;

    // Check if the filteredSourceEvent's ID exists in updatedTargetEvents
    for (var j = 0; j < updatedTargetEvents.length; j++) {
      var updatedTargetEvent = updatedTargetEvents[j];

      // Compare the sourceEventId of the filteredSourceEvent and updatedTargetEvent
      if (filteredSourceEvent.getId() === updatedTargetEvent.sourceEventId) {
        found = true;
        var sourceCalendarName = sourceCalendarNickname; //sourceCalendar.getName();
        var updatedSourceEventTitle = '[' + sourceCalendarName + '] ' + filteredSourceEvent.getTitle();

        // Check if the start time, end time, and title match
        if (
          filteredSourceEvent.getStartTime().getTime() !== updatedTargetEvent.getStartTime().getTime() ||
          filteredSourceEvent.getEndTime().getTime() !== updatedTargetEvent.getEndTime().getTime() ||
          updatedSourceEventTitle !== updatedTargetEvent.getTitle()
        ) {
          // Prepend the title with the name of the source calendar in square brackets
          var newTitle = '[' + sourceCalendarName + '] ' + filteredSourceEvent.getTitle();
          Logger.log('Single Event: Updating event: ' + newTitle);

          // Update the event in the target calendar
          updatedTargetEvent.setTime(filteredSourceEvent.getStartTime(), filteredSourceEvent.getEndTime());
          updatedTargetEvent.setTitle(newTitle);

          // Optionally, update other properties of the event here, if needed
        }

        break;
      }
    }

    // If the filteredSourceEvent is not found in updatedTargetEvents, add it to the newSingleEvents list
    if (!found) {
      newSingleEvents.push(filteredSourceEvent);
    }
  }

  // Add the new single events to the target calendar
  var targetCalendar = CalendarApp.getCalendarById(targetCalendarId);
  for (var k = 0; k < newSingleEvents.length; k++) {
    var newSingleEvent = newSingleEvents[k];
    var sourceCalendarName = sourceCalendarNickname; //sourceCalendar.getName();
    var newTitle = '[' + sourceCalendarName + '] ' + newSingleEvent.getTitle();
    var description = newSingleEvent.getDescription();
    var sourceEventId = newSingleEvent.getId();
    var newDescription = description + '\nSource Event ID: ' + sourceEventId;
    Logger.log('Creating new single event: ' + newTitle);
    targetCalendar.createEvent(newTitle, newSingleEvent.getStartTime(), newSingleEvent.getEndTime(), {
      description: newDescription
    });
  }
}

/**
 * Adds new recurring events from a source calendar to a target calendar.
 *
 * @param {Event[]} sourceEvents - An array of events from the source calendar.
 * @param {Event[]} updatedTargetEvents - An array of updated events from the target calendar.
 * @param {string} targetCalendarId - The ID of the target calendar.
 * @param {Calendar} sourceCalendar - The source calendar.
 * @param {string} sourceCalendarNickname - The nickname of the source calendar.
 */
function addNewRecurringEvents(sourceEvents, updatedTargetEvents, targetCalendarId, sourceCalendar, sourceCalendarNickname) {
  var filteredSourceEvents = sourceEvents.filter(function(event) {
    return event.isRecurringEvent();
  });

  // Iterate through each filteredSourceEvent
  for (var i = 0; i < filteredSourceEvents.length; i++) {
    var filteredSourceEvent = filteredSourceEvents[i];
    var found = false;

    // Compare the start time and end time of filteredSourceEvent with updatedTargetEvents
    for (var j = 0; j < updatedTargetEvents.length; j++) {
      var updatedTargetEvent = updatedTargetEvents[j];
      // Compare the start time and end time of the events
      if (
        filteredSourceEvent.getStartTime().getTime() === updatedTargetEvent.getStartTime().getTime() &&
        filteredSourceEvent.getStartTime().toDateString() === updatedTargetEvent.getStartTime().toDateString() &&
        filteredSourceEvent.getEndTime().getTime() === updatedTargetEvent.getEndTime().getTime() &&
        filteredSourceEvent.getEndTime().toDateString() === updatedTargetEvent.getEndTime().toDateString()
      ) {
        found = true;
        break;
      }
    }

    // If the filteredSourceEvent is not found in updatedTargetEvents, create a single non-recurring event in the target calendar
    if (!found) {
      var sourceCalendarName = sourceCalendarNickname;
      var newTitle = '[' + sourceCalendarName + '] ' + filteredSourceEvent.getTitle();
      var description = filteredSourceEvent.getDescription();
      var sourceEventId = filteredSourceEvent.getId();
      var newDescription = description + '\nSource Event ID: ' + sourceEventId;

      var targetCalendar = CalendarApp.getCalendarById(targetCalendarId);
      targetCalendar.createEvent(newTitle, filteredSourceEvent.getStartTime(), filteredSourceEvent.getEndTime(), { description: newDescription });
      Logger.log('Creating new single event from recurring: ' + newTitle);
    }
  }
}
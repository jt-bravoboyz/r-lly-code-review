// RallyHomeAttributes.swift
// IMPORTANT: This file must be added to BOTH the main App target AND
// the RallyHomeWidget extension target in Xcode.
//
// It defines the data contract between the app and the Live Activity widget.

import ActivityKit
import Foundation

struct RallyHomeAttributes: ActivityAttributes {
    public typealias RallyHomeStatus = ContentState

    public struct ContentState: Codable, Hashable {
        /// The three states the Live Activity moves through during the night.
        enum ActivityState: String, Codable {
            case eventLive        // Event is active — show "I'm Heading Home"
            case barHopTransition // Moving to next stop — show "I'm In" + "Heading Home"
            case headingHome      // User is OTW — show "Made It Home"
        }

        var activityState: ActivityState
        var eventName: String
        var attendeeCount: Int

        // Bar hop fields
        var currentStopNumber: Int?
        var totalStops: Int?
        var nextStopName: String?

        // Heading home fields
        var destinationName: String?
    }

    /// Immutable — set once when the activity is created.
    var eventId: String
}

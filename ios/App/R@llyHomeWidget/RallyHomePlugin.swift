// RallyHomePlugin.swift
// Capacitor plugin — add this file to the main App target in Xcode.
// It exposes Live Activity control to the React layer.

import Foundation
import Capacitor
import ActivityKit

@objc(RallyHomePlugin)
public class RallyHomePlugin: CAPPlugin {

    // MARK: - isLiveActivitySupported

    @objc func isLiveActivitySupported(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["supported": false])
        }
    }

    // MARK: - startLiveActivity (eventLive state)

    @objc func startLiveActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.reject("Live Activities require iOS 16.2+")
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are disabled in Settings")
            return
        }

        let eventId       = call.getString("eventId") ?? ""
        let eventName     = call.getString("eventName") ?? "R@lly"
        let attendeeCount = call.getInt("attendeeCount") ?? 0

        let attributes    = RallyHomeAttributes(eventId: eventId)
        let initialState  = RallyHomeAttributes.ContentState(
            activityState: .eventLive,
            eventName:     eventName,
            attendeeCount: attendeeCount
        )

        do {
            let activity = try Activity<RallyHomeAttributes>.request(
                attributes:   attributes,
                contentState: initialState,
                pushType:     nil
            )
            call.resolve(["activityId": activity.id])
        } catch {
            call.reject("Failed to start Live Activity: \(error.localizedDescription)")
        }
    }

    // MARK: - updateToBarHop

    @objc func updateToBarHop(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.reject("iOS 16.2+ required"); return }

        let eventName          = call.getString("eventName") ?? "R@lly"
        let currentStopNumber  = call.getInt("currentStopNumber")
        let totalStops         = call.getInt("totalStops")
        let nextStopName       = call.getString("nextStopName")

        let newState = RallyHomeAttributes.ContentState(
            activityState:      .barHopTransition,
            eventName:          eventName,
            attendeeCount:      0,
            currentStopNumber:  currentStopNumber,
            totalStops:         totalStops,
            nextStopName:       nextStopName
        )
        Task {
            for activity in Activity<RallyHomeAttributes>.activities {
                await activity.update(using: newState)
            }
            call.resolve()
        }
    }

    // MARK: - updateToHeadingHome

    @objc func updateToHeadingHome(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.reject("iOS 16.2+ required"); return }

        let eventName       = call.getString("eventName") ?? "R@lly"
        let destinationName = call.getString("destinationName")

        let newState = RallyHomeAttributes.ContentState(
            activityState:   .headingHome,
            eventName:       eventName,
            attendeeCount:   0,
            destinationName: destinationName
        )
        Task {
            for activity in Activity<RallyHomeAttributes>.activities {
                await activity.update(using: newState)
            }
            call.resolve()
        }
    }

    // MARK: - endLiveActivity

    @objc func endLiveActivity(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.reject("iOS 16.2+ required"); return }
        Task {
            for activity in Activity<RallyHomeAttributes>.activities {
                await activity.end(dismissalPolicy: .immediate)
            }
            call.resolve()
        }
    }
}

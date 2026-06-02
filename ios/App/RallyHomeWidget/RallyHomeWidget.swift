// RallyHomeWidget.swift
// Live Activity widget with three states that evolve through the night.
// Requires iOS 16.2+. Buttons use custom URL scheme deep links so the
// user can act from the Lock Screen without opening the app.

import ActivityKit
import WidgetKit
import SwiftUI

// Brand orange — matches PRIMARY in the React app (#F47A19)
private let rallyOrange = Color(red: 244 / 255, green: 122 / 255, blue: 25 / 255)
private let appScheme   = "com.bravoboyz.rally"

// MARK: - Widget Configuration

struct RallyHomeWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RallyHomeAttributes.self) { context in
            LockScreenBannerView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.85))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 6) {
                        Image(systemName: "house.fill")
                            .foregroundColor(rallyOrange)
                            .font(.title3)
                        Text("R@lly Home")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(stateEmoji(context.state.activityState))
                        .font(.title3)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    IslandBottomView(context: context)
                        .padding(.bottom, 4)
                }
            } compactLeading: {
                Image(systemName: "house.fill")
                    .foregroundColor(rallyOrange)
                    .font(.caption)
            } compactTrailing: {
                Text(compactLabel(context.state))
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
            } minimal: {
                Image(systemName: "house.fill")
                    .foregroundColor(rallyOrange)
            }
            .widgetURL(deepLink("open", eventId: context.attributes.eventId))
        }
    }

    private func stateEmoji(_ s: RallyHomeAttributes.ContentState.ActivityState) -> String {
        switch s {
        case .eventLive:        return "🎉"
        case .barHopTransition: return "🍺"
        case .headingHome:      return "🏠"
        }
    }

    private func compactLabel(_ s: RallyHomeAttributes.ContentState) -> String {
        switch s.activityState {
        case .eventLive:        return "Live"
        case .barHopTransition: return "Moving"
        case .headingHome:      return "OTW 🏠"
        }
    }
}

// MARK: - Lock Screen / Notification Center Banner

struct LockScreenBannerView: View {
    let context: ActivityViewContext<RallyHomeAttributes>

    var body: some View {
        switch context.state.activityState {
        case .eventLive:
            EventLiveView(context: context)
        case .barHopTransition:
            BarHopView(context: context)
        case .headingHome:
            HeadingHomeView(context: context)
        }
    }
}

// MARK: - State 1: Event Live

struct EventLiveView: View {
    let context: ActivityViewContext<RallyHomeAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "party.popper.fill")
                    .foregroundColor(rallyOrange)
                    .font(.title3)
                VStack(alignment: .leading, spacing: 2) {
                    Text(context.state.eventName)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Text("\(context.state.attendeeCount) people here")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.65))
                }
                Spacer()
            }

            Link(destination: deepLink("heading-home", eventId: context.attributes.eventId)) {
                Label("I'm Heading Home", systemImage: "house.fill")
                    .font(.system(size: 14, weight: .semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(rallyOrange)
                    .foregroundColor(.white)
                    .cornerRadius(22)
            }
        }
        .padding(16)
    }
}

// MARK: - State 2: Bar Hop Transition

struct BarHopView: View {
    let context: ActivityViewContext<RallyHomeAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "arrow.right.circle.fill")
                    .foregroundColor(rallyOrange)
                    .font(.title3)
                VStack(alignment: .leading, spacing: 2) {
                    if let stop = context.state.currentStopNumber,
                       let total = context.state.totalStops {
                        Text("Moving to Stop \(stop) of \(total)")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                    } else {
                        Text("Bar Hop — Next Stop")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(.white)
                    }
                    if let next = context.state.nextStopName {
                        Text(next)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.65))
                            .lineLimit(1)
                    }
                }
                Spacer()
            }

            HStack(spacing: 10) {
                Link(destination: deepLink("im-in", eventId: context.attributes.eventId)) {
                    Text("I'm In")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.18))
                        .foregroundColor(.white)
                        .cornerRadius(22)
                }

                Link(destination: deepLink("heading-home", eventId: context.attributes.eventId)) {
                    Text("Heading Home")
                        .font(.system(size: 14, weight: .semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(rallyOrange)
                        .foregroundColor(.white)
                        .cornerRadius(22)
                }
            }
        }
        .padding(16)
    }
}

// MARK: - State 3: Heading Home

struct HeadingHomeView: View {
    let context: ActivityViewContext<RallyHomeAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "house.fill")
                    .foregroundColor(rallyOrange)
                    .font(.title3)
                VStack(alignment: .leading, spacing: 2) {
                    Text("Heading Home 🏠")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                    if let dest = context.state.destinationName {
                        Text(dest)
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.65))
                            .lineLimit(1)
                    } else {
                        Text("Your squad knows you're on the way")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.65))
                    }
                }
                Spacer()
            }

            Link(destination: deepLink("arrived", eventId: context.attributes.eventId)) {
                Label("Made It Home ✓", systemImage: "checkmark.circle.fill")
                    .font(.system(size: 14, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(22)
            }
        }
        .padding(16)
    }
}

// MARK: - Dynamic Island Expanded Bottom

struct IslandBottomView: View {
    let context: ActivityViewContext<RallyHomeAttributes>

    var body: some View {
        switch context.state.activityState {
        case .eventLive:
            Link(destination: deepLink("heading-home", eventId: context.attributes.eventId)) {
                Text("I'm Heading Home →")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(rallyOrange)
            }
        case .barHopTransition:
            HStack {
                Link(destination: deepLink("im-in", eventId: context.attributes.eventId)) {
                    Text("I'm In")
                        .font(.caption)
                        .foregroundColor(.white.opacity(0.8))
                }
                Spacer()
                Link(destination: deepLink("heading-home", eventId: context.attributes.eventId)) {
                    Text("Heading Home →")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(rallyOrange)
                }
            }
            .padding(.horizontal, 4)
        case .headingHome:
            Link(destination: deepLink("arrived", eventId: context.attributes.eventId)) {
                Text("Made It Home ✓")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.green)
            }
        }
    }
}

// MARK: - Helpers

/// Builds a deep link URL for a Live Activity button action.
/// The app's appUrlOpen handler in nativeBootstrap.ts processes these.
private func deepLink(_ action: String, eventId: String) -> URL {
    URL(string: "\(appScheme)://rally-home/\(action)?eventId=\(eventId)")!
}

// RallyHomePlugin.m
// Objective-C bridge — registers the Swift plugin with Capacitor.
// Add this file to the main App target in Xcode.

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(RallyHomePlugin, "RallyHomePlugin",
    CAP_PLUGIN_METHOD(isLiveActivitySupported, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(startLiveActivity,        CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(updateToBarHop,           CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(updateToHeadingHome,      CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(endLiveActivity,          CAPPluginReturnPromise);
)

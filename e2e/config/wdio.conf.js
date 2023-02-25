let capabilities = {
  "platformName": "Android",
  "appium:deviceName": process.env.TEST_DEVICE_ANDROID || "generic_x86",
  "appium:app":
    process.env.TEST_APK_PATH ||
    "./android/app/build/outputs/apk/debug/app-universal-debug.apk",
  "appium:automationName": "UiAutomator2",
  "appium:snapshotMaxDepth": 500,
  "appium:autoGrantPermissions": true,
}
if (process.env.E2E_DEVICE === "ios") {
  capabilities = {
    "platformName": "iOS",
    "appium:deviceName": process.env.TEST_DEVICE_IOS || "iPhone 14",
    "appium:platformVersion": process.env.PLATFORM_VERSION || "",
    "appium:bundleId": "io.galoy.bitcoinbeach",
    "appium:automationName": "XCUITest",
    "appium:snapshotMaxDepth": 500,
    "appium:autoGrantPermissions": true,
    "appium:app":
      process.env.TEST_APK_PATH ||
      "./android/app/build/outputs/apk/debug/app-universal-debug.apk",
  }
}

const baseSpec = {
  specs: [["./e2e/**.e2e.spec.ts"]],
  reporters: ["spec"],
  framework: "mocha",
  mochaOpts: {
    ui: "bdd",
    timeout: 120000,
  },
  exclude: [],

  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true,
      project: "e2e/tsconfig.json",
    },
  },
}

exports.baseSpec = baseSpec

exports.config = {
  ...baseSpec,
  capabilities: [capabilities],
}

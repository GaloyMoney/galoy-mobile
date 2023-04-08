// Welcome to the main entry point of the app.
//
// In this file, we'll be kicking off our app

// language related import
import "intl-pluralrules"
import "moment/locale/es"
import "moment/locale/fr-ca"
import "moment/locale/pt-br"
import "./utils/polyfill"

import "react-native-reanimated"

import "@react-native-firebase/crashlytics"
import { ThemeProvider } from "@rneui/themed"
import "node-libs-react-native/globals" // needed for Buffer?
import * as React from "react"
import ErrorBoundary from "react-native-error-boundary"
import { RootSiblingParent } from "react-native-root-siblings"
import { GaloyToast } from "./components/galoy-toast"
import { NotificationComponent } from "./components/notification"
import { GaloyClient } from "./graphql/client"
import TypesafeI18n from "./i18n/i18n-react"
import { loadAllLocales } from "./i18n/i18n-util.sync"
import { AppStateWrapper } from "./navigation/app-state"
import { NavigationContainerWrapper } from "./navigation/navigation-container-wrapper"
import { RootStack } from "./navigation/root-navigator"
import theme from "./rne-theme/theme"
import { ErrorScreen } from "./screens/error-screen"
import { PersistentStateProvider } from "./store/persistent-state"
import { detectDefaultLocale } from "./utils/locale-detector"
import { ThemeSyncGraphql } from "./utils/theme-sync"
import DeviceInfo from "react-native-device-info"

// FIXME should we only load the currently used local?
// this would help to make the app load faster
// this will become more important when we add more languages
// and when the earn section will be added
//
// alternatively, could try loadAllLocalesAsync()
loadAllLocales()

import * as Sentry from "@sentry/react-native"

DeviceInfo.isEmulator().then((isEmulator) => {
  Sentry.init({
    dsn: "https://e9dacf60cf5b489e900c502fdc09b45e@o4504724052639744.ingest.sentry.io/4504724057227264",
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
    // We recommend adjusting this value in production.
    tracesSampleRate: 1.0,
    enableNative: !isEmulator,
  })
})

/**
 * This is the root component of our app.
 */
export const App = () => (
  <Sentry.TouchEventBoundary>
    <PersistentStateProvider>
      <TypesafeI18n locale={detectDefaultLocale()}>
        <ThemeProvider theme={theme}>
          <GaloyClient>
            <ErrorBoundary FallbackComponent={ErrorScreen}>
              <NavigationContainerWrapper>
                <RootSiblingParent>
                  <AppStateWrapper />
                  <NotificationComponent />
                  <RootStack />
                  <GaloyToast />
                </RootSiblingParent>
              </NavigationContainerWrapper>
            </ErrorBoundary>
            <ThemeSyncGraphql />
          </GaloyClient>
        </ThemeProvider>
      </TypesafeI18n>
    </PersistentStateProvider>
  </Sentry.TouchEventBoundary>
)

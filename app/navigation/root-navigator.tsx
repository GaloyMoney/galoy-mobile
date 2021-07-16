/* eslint-disable react/display-name */
import { useApolloClient, useQuery } from "@apollo/client"
import PushNotificationIOS from "@react-native-community/push-notification-ios"
import messaging from "@react-native-firebase/messaging"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { CardStyleInterpolators, createStackNavigator } from "@react-navigation/stack"
import i18n from "i18n-js"
// eslint-disable-next-line import/no-unassigned-import
import "node-libs-react-native/globals" // needed for Buffer?
import * as React from "react"
import { useEffect } from "react"
import { AppState } from "react-native"
import EStyleSheet from "react-native-extended-stylesheet"
import * as RNLocalize from "react-native-localize"
import Icon from "react-native-vector-icons/Ionicons"
import { GET_LANGUAGE, QUERY_PRICE } from "../graphql/query"
import { translate } from "../i18n"
import {
  AuthenticationScreen,
  AuthenticationCheckScreen,
} from "../screens/authentication-screen"
import { PinScreen } from "../screens/authentication-screen/pin-screen"
import { ContactsDetailScreen } from "../screens/contacts-detail-screen"
import { ContactsScreen } from "../screens/contacts-screen"
import { DebugScreen } from "../screens/debug-screen"
import { EarnMapDataInjected } from "../screens/earns-map-screen"
import { EarnQuiz, EarnSection } from "../screens/earns-screen"
import { SectionCompleted } from "../screens/earns-screen/section-completed"
import { GetStartedScreen } from "../screens/get-started-screen"
import { MapScreen } from "../screens/map-screen/map-screen"
import { MoveMoneyScreenDataInjected } from "../screens/move-money-screen"
import {
  WelcomePhoneInputScreen,
  WelcomePhoneValidationScreenDataInjected,
} from "../screens/phone-auth-screen"
import { PriceScreen } from "../screens/price-screen/price-screen"
import { ReceiveBitcoinScreen } from "../screens/receive-bitcoin-screen"
import { ScanningQRCodeScreen, SendBitcoinScreen } from "../screens/send-bitcoin-screen"
import { SettingsScreen, UsernameScreen } from "../screens/settings-screen"
import { LanguageScreen } from "../screens/settings-screen/language-screen"
import { SecurityScreen } from "../screens/settings-screen/security-screen"
import { TransactionDetailScreen } from "../screens/transaction-detail-screen"
import { TransactionHistoryScreenDataInjected } from "../screens/transaction-screen/transaction-screen"
import { WelcomeFirstScreen } from "../screens/welcome-screens"
import { palette } from "../theme/palette"
import { AccountType } from "../utils/enum"
import { addDeviceToken } from "../utils/notifications"
import { getNetwork, Token } from "../utils/token"
import { showModalClipboardIfValidPayment } from "../utils/clipboard"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PushNotification = require("react-native-push-notification")

// Must be outside of any component LifeCycle (such as `componentDidMount`).
PushNotification.configure({
  // (optional) Called when Token is generated (iOS and Android)
  onRegister(token) {
    console.log("TOKEN:", token)
  },

  // (required) Called when a remote is received or opened, or local notification is opened
  onNotification(notification) {
    console.log("NOTIFICATION:", notification)

    // process the notification

    // (required) Called when a remote is received or opened, or local notification is opened
    notification.finish(PushNotificationIOS.FetchResult.NoData)
  },

  // (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
  onAction(notification) {
    console.log("ACTION:", notification.action)
    console.log("NOTIFICATION:", notification)

    // process the action
  },

  // (optional) Called when the user fails to register for remote notifications. Typically occurs when APNS is having issues, or the device is a simulator. (iOS)
  onRegistrationError(err) {
    console.error(`onRegistration error: ${err.message}`, err)
  },

  // IOS ONLY (optional): default: all - Permissions to register.
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },

  // Should the initial notification be popped automatically
  // default: true
  popInitialNotification: false,

  /**
   * (optional) default: true
   * - Specified if permissions (ios) and token (android and ios) will requested or not,
   * - if not, you must call PushNotificationsHandler.requestPermissions() later
   * - if you are not using remote notification or do not have Firebase installed, use this:
   *     requestPermissions: Platform.OS === 'ios'
   */
  requestPermissions: false,
})

const styles = EStyleSheet.create({
  bottomNavigatorStyle: {
    height: "10%",
    // height: '60rem'
    // height: 100
  },
})

const size = 32

const RootNavigator = createStackNavigator()

export const RootStack = () => {
  const appState = React.useRef(AppState.currentState)
  const client = useApolloClient()

  useEffect(() => {
    AppState.addEventListener("change", _handleAppStateChange)

    return () => {
      AppState.removeEventListener("change", _handleAppStateChange)
    }
  }, [])

  const _handleAppStateChange = (nextAppState) => {
    if (appState.current.match(/background/) && nextAppState === "active") {
      console.log("App has come to the foreground!")
      showModalClipboardIfValidPayment(client)
    }

    appState.current = nextAppState
  }

  const showNotification = (remoteMessage) => {
    console.log({ remoteMessage })

    const soundName = undefined
    PushNotification.localNotification({
      /* Android Only Properties */
      ticker: "My Notification Ticker", // (optional)
      autoCancel: true, // (optional) default: true
      largeIcon: "ic_launcher", // (optional) default: "ic_launcher"
      smallIcon: "ic_notification", // (optional) default: "ic_notification" with fallback for "ic_launcher"
      // bigText: 'My big text that will be shown when notification is expanded', // (optional) default: "message" prop
      // subText: 'This is a subText', // (optional) default: none
      // color: 'red', // (optional) default: system default
      vibrate: true, // (optional) default: true
      vibration: 300, // vibration length in milliseconds, ignored if vibrate=false, default: 1000
      tag: "some_tag", // (optional) add tag to message
      group: "group", // (optional) add group to message
      ongoing: false, // (optional) set whether this is an "ongoing" notification
      // actions: ['Yes', 'No'], // (Android only) See the doc for notification actions to know more
      // invokeApp: true, // (optional) This enable click on actions to bring back the application to foreground or stay in background, default: true

      /* iOS only properties */
      alertAction: "view", // (optional) default: view
      category: "", // (optional) default: empty string

      /* iOS and Android properties */
      // id: this.lastId, // (optional) Valid unique 32 bit integer specified as string. default: Autogenerated Unique ID
      title: remoteMessage.notification.title, // (optional)
      message: remoteMessage.notification.body, // (required)
      userInfo: { screen: "home" }, // (optional) default: {} (using null throws a JSON value '<null>' error)
      playSound: !!soundName, // (optional) default: true
      soundName: soundName || "default", // (optional) Sound to play when the notification is shown. Value of 'default' plays the default sound. It can be set to a custom sound such as 'android.resource://com.xyz/raw/my_sound'. It will look for the 'my_sound' audio file in 'res/raw' directory and play it. default: 'default' (default sound is played)
      // number: 18, // (optional) Valid 32 bit integer specified as string. default: none (Cannot be zero) --> badge
    })
  }

  useQuery(QUERY_PRICE, {
    notifyOnNetworkStatusChange: true,
    pollInterval: 30000,
  })

  const fallback = { languageTag: "es", isRTL: false }
  const { languageTag } =
    RNLocalize.findBestAvailableLanguage(Object.keys(i18n.translations)) || fallback

  const { data } = useQuery(GET_LANGUAGE, { fetchPolicy: "cache-only" })
  const language = data?.me?.language ?? ""
  i18n.locale = language || languageTag

  // TODO: need to add isHeadless?
  // https://rnfirebase.io/messaging/usage

  // TODO: check whether react-native-push-notification can give a FCM token
  // for iOS, which would remove the need for firebase.messaging() dependancy
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.log("onMessage")
      showNotification(remoteMessage)
    })

    return unsubscribe
  }, [])

  // useEffect(() => {
  // const isDeviceRegisteredForRemoteMessages = messaging().isDeviceRegisteredForRemoteMessages
  // Alert.alert(`isDeviceRegisteredForRemoteMessages: ${isDeviceRegisteredForRemoteMessages ? true:false}`)
  // const isAutoInitEnabled = messaging().isAutoInitEnabled
  // Alert.alert(`isAutoInitEnabled: ${isAutoInitEnabled ? true:false}`) // true
  // }, []);

  useEffect(() => {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log("background arrived from setBackgroundMessageHandler")
      showNotification(remoteMessage)
    })
  }, [])

  useEffect(() => {
    // onNotificationOpenedApp: When the application is running, but in the background.
    messaging().onNotificationOpenedApp((remoteMessage) => {
      // console.log(
      //   'Notification caused app to open from background state:',
      //   remoteMessage.notification,
      // );
      // navigation.navigate(remoteMessage.data.type);
    })

    // getInitialNotification: When the application is opened from a quit state.
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        // if (remoteMessage) {
        //   console.log(
        //     'Notification caused app to open from quit state:',
        //     remoteMessage.notification,
        //   );
        //   setInitialRoute(remoteMessage.data.type); // e.g. "Settings"
        // }
        // setLoading(false);
      })
  }, [])

  useEffect(() => messaging().onTokenRefresh((token) => addDeviceToken(client)), [])

  const token = new Token()

  return (
    <RootNavigator.Navigator
      screenOptions={{ gestureEnabled: false }}
      initialRouteName={token.has() ? "authenticationCheck" : "getStarted"}
    >
      <RootNavigator.Screen
        name="getStarted"
        component={GetStartedScreen}
        options={{
          headerShown: false,
          animationEnabled: false,
        }}
      />
      <RootNavigator.Screen name="debug" component={DebugScreen} />
      <RootNavigator.Screen
        name="welcomeFirst"
        component={WelcomeFirstScreen}
        options={{ headerShown: false }}
      />
      <RootNavigator.Screen
        name="authenticationCheck"
        component={AuthenticationCheckScreen}
        options={{ headerShown: false, animationEnabled: false }}
      />
      <RootNavigator.Screen
        name="authentication"
        component={AuthenticationScreen}
        options={{ headerShown: false, animationEnabled: false }}
      />
      <RootNavigator.Screen
        name="pin"
        component={PinScreen}
        options={{ headerShown: false }}
      />
      <RootNavigator.Screen
        name="Primary"
        component={PrimaryNavigator}
        options={{
          headerShown: false,
          animationEnabled: false,
        }}
      />
      <StackMoveMoney.Screen
        name="scanningQRCode"
        component={ScanningQRCodeScreen}
        options={{
          title: translate("ScanningQRCodeScreen.title"),
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
        }}
      />
      <RootNavigator.Screen
        name="earnsSection"
        component={EarnSection}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          headerStyle: { backgroundColor: palette.blue },
          headerTintColor: palette.white,
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 18,
          },
        }}
      />
      <RootNavigator.Screen
        name="earnsQuiz"
        component={EarnQuiz}
        options={{
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
        }}
      />
      <RootNavigator.Screen
        name="settings"
        component={SettingsScreen}
        options={() => ({
          title: "Settings",
        })}
      />
      <RootNavigator.Screen
        name="setUsername"
        component={UsernameScreen}
        options={() => ({
          title: "",
        })}
      />
      <RootNavigator.Screen
        name="language"
        component={LanguageScreen}
        options={() => ({
          title: "Language preference",
        })}
      />
      <RootNavigator.Screen
        name="security"
        component={SecurityScreen}
        options={() => ({
          title: "Security",
        })}
      />
      <RootNavigator.Screen name="Profile" component={DebugScreen} />
      <RootNavigator.Screen
        name="sectionCompleted"
        component={SectionCompleted}
        options={{
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
        }}
      />
      <RootNavigator.Screen
        name="phoneValidation"
        component={PhoneValidationNavigator}
        options={{
          headerShown: false,
          cardStyleInterpolator: CardStyleInterpolators.forVerticalIOS,
        }}
      />
      <RootNavigator.Screen
        name="transactionDetail"
        component={TransactionDetailScreen}
        options={{
          headerShown: false,
          // cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
        }}
      />
      <RootNavigator.Screen
        name="transactionHistory"
        component={TransactionHistoryScreenDataInjected}
        options={{ title: "Transaction History" }}
      />
      <RootNavigator.Screen
        name="priceDetail"
        component={PriceScreen}
        options={{
          cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          title: translate("common.bitcoinPrice"),
        }}
        // options={({ navigation }) => ({
        //   headerRight: () => (
        //     <Icon
        //       name={"ios-person"}
        //       size={32}
        //       color={palette.darkGrey}
        //       style={styles.person}
        //       onPress={() => navigation.navigate("debug")}
        //     />
        //   ),
        // })}
        initialParams={{ account: AccountType.Bitcoin }}
      />
    </RootNavigator.Navigator>
  )
}

const StackContacts = createStackNavigator()

export const ContactNavigator = () => (
  <StackContacts.Navigator>
    <StackContacts.Screen
      name="Contacts"
      component={ContactsScreen}
      options={{
        title: translate("ContactsScreen.title"),
      }}
    />
    <StackContacts.Screen
      name="contactDetail"
      component={ContactsDetailScreen}
      options={{ headerShown: false }}
    />
  </StackContacts.Navigator>
)

const StackMoveMoney = createStackNavigator()

export const MoveMoneyNavigator = () => (
  <StackMoveMoney.Navigator>
    <StackMoveMoney.Screen
      name="moveMoney"
      component={MoveMoneyScreenDataInjected}
      // options={{ title: translate("MoveMoneyScreen.title") }}
      options={{
        headerShown: false,
        title: translate("MoveMoneyScreen.title"),
      }}
    />
    <StackMoveMoney.Screen
      name="sendBitcoin"
      component={SendBitcoinScreen}
      options={{ title: translate("SendBitcoinScreen.title") }}
    />
    <StackMoveMoney.Screen
      name="receiveBitcoin"
      component={ReceiveBitcoinScreen}
      options={{
        title: translate("ReceiveBitcoinScreen.title"),
        // headerShown: false,
      }}
    />
  </StackMoveMoney.Navigator>
)

const StackPhoneValidation = createStackNavigator()

export const PhoneValidationNavigator = () => (
  <StackPhoneValidation.Navigator>
    <StackPhoneValidation.Screen
      name="welcomePhoneInput"
      options={{
        headerShown: false,
        title: translate("common.phoneNumber"),
      }}
      component={WelcomePhoneInputScreen}
    />
    <StackPhoneValidation.Screen
      name="welcomePhoneValidation"
      component={WelcomePhoneValidationScreenDataInjected}
      options={{
        title: "",
      }}
    />
  </StackPhoneValidation.Navigator>
)

const Tab = createBottomTabNavigator()

type TabProps = {
  color: string
}

export const PrimaryNavigator = () => {
  const [network, setNetwork] = React.useState("mainnet")

  React.useEffect(() => {
    ;(async () => {
      setNetwork(await getNetwork())
    })()
  }, [])

  return (
    <Tab.Navigator
      initialRouteName="MoveMoney"
      tabBarOptions={{
        activeTintColor: network === "mainnet" ? palette.lightBlue : palette.orange,
        inactiveTintColor: palette.lightGrey,
        style: styles.bottomNavigatorStyle,
        labelStyle: { paddingBottom: 6 },
        keyboardHidesTabBar: true,
      }}
    >
      <Tab.Screen
        name="MoveMoney"
        component={MoveMoneyNavigator}
        options={{
          title: translate("MoveMoneyScreen.title"),
          tabBarIcon: ({ color }: TabProps) => (
            <Icon name="ios-home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactNavigator}
        options={{
          title: translate("ContactsScreen.title"),
          tabBarIcon: ({ color }: TabProps) => (
            <Icon name="ios-people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: translate("MapScreen.title"),
          tabBarIcon: ({ color }: TabProps) => (
            <Icon name="ios-map-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Earn"
        component={EarnMapDataInjected}
        options={{
          title: translate("EarnScreen.title"),
          tabBarIcon: ({ color }: TabProps) => (
            <Icon name="ios-rocket" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}

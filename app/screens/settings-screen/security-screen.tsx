import * as React from "react"
import { useState } from "react"
import { RouteProp, useFocusEffect } from "@react-navigation/native"
import { Text, View } from "react-native"
import { StackNavigationProp } from "@react-navigation/stack"
import { Button, Switch } from "@rneui/base"
import EStyleSheet from "react-native-extended-stylesheet"

import { Screen } from "../../components/screen"
import { palette } from "../../theme/palette"
import BiometricWrapper from "../../utils/biometricAuthentication"
import { toastShow } from "../../utils/toast"
import type { RootStackParamList } from "../../navigation/stack-param-lists"
import { PinScreenPurpose } from "../../utils/enum"
import KeyStoreWrapper from "../../utils/storage/secureStorage"
import {
  saveHideBalance,
  saveHiddenBalanceToolTip,
} from "../../graphql/client-only-query"
import { useApolloClient } from "@apollo/client"
import { useI18nContext } from "@app/i18n/i18n-react"
import { useHideBalanceQuery } from "@app/graphql/generated"
import { useDarkMode } from "@app/hooks/use-darkmode"

const styles = EStyleSheet.create({
  buttonLight: {
    backgroundColor: palette.white,
    paddingBottom: 16,
    paddingLeft: 0,
    paddingRight: 16,
    paddingTop: 16,
  },

  buttonDark: {
    backgroundColor: palette.black,
    paddingBottom: 16,
    paddingLeft: 0,
    paddingRight: 16,
    paddingTop: 16,
  },

  buttonTitleLight: {
    color: palette.black,
    fontSize: 16,
    fontWeight: "normal",
  },

  buttonTitleDark: {
    color: palette.white,
    fontSize: 16,
    fontWeight: "normal",
  },

  container: {
    minHeight: "100%",
    paddingLeft: 24,
    paddingRight: 24,
  },

  descriptionLight: {
    color: palette.darkGrey,
    fontSize: 14,
    marginTop: 2,
  },
  descriptionDark: {
    color: palette.lighterGrey,
    fontSize: 14,
    marginTop: 2,
  },

  settingContainer: {
    borderBottomColor: palette.lightGrey,
    borderBottomWidth: 1,
    flexDirection: "row",
  },

  subtitleLight: {
    color: palette.darkGrey,
    fontSize: 16,
    marginTop: 16,
  },

  subtitleDark: {
    color: palette.white,
    fontSize: 16,
    marginTop: 16,
  },

  switch: {
    bottom: 18,
    position: "absolute",
    right: 0,
  },

  textContainer: {
    marginBottom: 12,
    marginRight: 60,
    marginTop: 32,
  },

  titleLight: {
    color: palette.black,
    fontSize: 20,
    fontWeight: "bold",
  },
  titleDark: {
    color: palette.white,
    fontSize: 20,
    fontWeight: "bold",
  },
})

type Props = {
  navigation: StackNavigationProp<RootStackParamList, "security">
  route: RouteProp<RootStackParamList, "security">
}

export const SecurityScreen: React.FC<Props> = ({ route, navigation }) => {
  const darkMode = useDarkMode()

  const client = useApolloClient()
  const { mIsBiometricsEnabled, mIsPinEnabled } = route.params
  const { data: { hideBalance } = {} } = useHideBalanceQuery()
  const { LL } = useI18nContext()
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(mIsBiometricsEnabled)
  const [isPinEnabled, setIsPinEnabled] = useState(mIsPinEnabled)
  const [isHideBalanceEnabled, setIsHideBalanceEnabled] = useState(hideBalance)

  useFocusEffect(() => {
    getIsBiometricsEnabled()
    getIsPinEnabled()
  })
  const getIsBiometricsEnabled = async () => {
    setIsBiometricsEnabled(await KeyStoreWrapper.getIsBiometricsEnabled())
  }

  const getIsPinEnabled = async () => {
    setIsPinEnabled(await KeyStoreWrapper.getIsPinEnabled())
  }

  const onBiometricsValueChanged = async (value: boolean) => {
    if (value) {
      try {
        if (await BiometricWrapper.isSensorAvailable()) {
          // Presents the OS specific authentication prompt
          BiometricWrapper.authenticate(
            LL.AuthenticationScreen.setUpAuthenticationDescription(),
            handleAuthenticationSuccess,
            handleAuthenticationFailure,
          )
        } else {
          toastShow({
            message: (translations) => translations.SecurityScreen.biometryNotAvailable(),
            currentTranslation: LL,
          })
        }
      } catch {
        toastShow({
          message: (translations) => translations.SecurityScreen.biometryNotEnrolled(),
          currentTranslation: LL,
        })
      }
    } else if (await KeyStoreWrapper.removeIsBiometricsEnabled()) {
      setIsBiometricsEnabled(false)
    }
  }

  const handleAuthenticationSuccess = async () => {
    if (await KeyStoreWrapper.setIsBiometricsEnabled()) {
      setIsBiometricsEnabled(true)
    }
  }

  const handleAuthenticationFailure = () => {
    // This is called when a user cancels or taps out of the authentication prompt,
    // so no action is necessary.
  }

  const onPinValueChanged = async (value: boolean) => {
    if (value) {
      navigation.navigate("pin", { screenPurpose: PinScreenPurpose.SetPin })
    } else {
      removePin()
    }
  }

  const onHideBalanceValueChanged = async (value: boolean) => {
    if (value) {
      setIsHideBalanceEnabled(await saveHideBalance(client, true))
      await saveHiddenBalanceToolTip(client, true)
    } else {
      setIsHideBalanceEnabled(await saveHideBalance(client, false))
      await saveHiddenBalanceToolTip(client, false)
    }
  }

  const removePin = async () => {
    if (await KeyStoreWrapper.removePin()) {
      KeyStoreWrapper.removePinAttempts()
      setIsPinEnabled(false)
    }
  }

  return (
    <Screen
      style={styles.container}
      backgroundColor={darkMode ? palette.black : palette.white}
      preset="scroll"
    >
      <View style={styles.settingContainer}>
        <View style={styles.textContainer}>
          <Text style={darkMode ? styles.titleDark : styles.titleLight}>
            {LL.SecurityScreen.biometricTitle()}
          </Text>
          <Text style={darkMode ? styles.subtitleDark : styles.subtitleLight}>
            {LL.SecurityScreen.biometricSubtitle()}
          </Text>
          <Text style={darkMode ? styles.descriptionDark : styles.descriptionLight}>
            {LL.SecurityScreen.biometricDescription()}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={isBiometricsEnabled}
          color={palette.lightBlue}
          onValueChange={onBiometricsValueChanged}
        />
      </View>
      <View style={styles.settingContainer}>
        <View style={styles.textContainer}>
          <Text style={darkMode ? styles.titleDark : styles.titleLight}>
            {LL.SecurityScreen.pinTitle()}
          </Text>
          <Text style={darkMode ? styles.subtitleDark : styles.subtitleLight}>
            {LL.SecurityScreen.pinSubtitle()}
          </Text>
          <Text style={darkMode ? styles.descriptionDark : styles.descriptionLight}>
            {LL.SecurityScreen.pinDescription()}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={isPinEnabled}
          color={palette.lightBlue}
          onValueChange={onPinValueChanged}
        />
      </View>
      <View style={styles.settingContainer}>
        <Button
          buttonStyle={darkMode ? styles.buttonDark : styles.buttonLight}
          titleStyle={darkMode ? styles.buttonTitleDark : styles.buttonTitleLight}
          title={LL.SecurityScreen.setPin()}
          onPress={() =>
            navigation.navigate("pin", { screenPurpose: PinScreenPurpose.SetPin })
          }
        />
      </View>
      <View style={styles.settingContainer}>
        <View style={styles.textContainer}>
          <Text style={darkMode ? styles.titleDark : styles.titleLight}>
            {LL.SecurityScreen.hideBalanceTitle()}
          </Text>
          <Text style={darkMode ? styles.subtitleDark : styles.subtitleLight}>
            {LL.SecurityScreen.hideBalanceSubtitle()}
          </Text>
          <Text style={darkMode ? styles.descriptionDark : styles.descriptionLight}>
            {LL.SecurityScreen.hideBalanceDescription()}
          </Text>
        </View>
        <Switch
          style={styles.switch}
          value={isHideBalanceEnabled}
          color={palette.lightBlue}
          onValueChange={onHideBalanceValueChanged}
        />
      </View>
    </Screen>
  )
}

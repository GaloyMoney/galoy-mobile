import * as React from "react"
import { useEffect } from "react"
import { Image } from "react-native"
import EStyleSheet from "react-native-extended-stylesheet"
import { useApolloClient } from "@apollo/client"

import { Screen } from "../../components/screen"
import { palette } from "../../theme/palette"
import KeyStoreWrapper from "../../utils/storage/secureStorage"
import BiometricWrapper from "../../utils/biometricAuthentication"
import type { ScreenType } from "../../types/screen"
import { AuthenticationScreenPurpose, PinScreenPurpose } from "../../utils/enum"
import { showModalClipboardIfValidPayment } from "../../utils/clipboard"

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BitcoinBeachLogo = require("../get-started-screen/bitcoinBeach3.png")

const styles = EStyleSheet.create({
  Logo: {
    marginTop: 24,
    maxHeight: "50%",
    maxWidth: "50%",
  },

  container: {
    alignItems: "center",
    flex: 1,
    width: "100%",
  },
})

type Props = {
  navigation: any
}

export const AuthenticationCheckScreen: ScreenType = ({ navigation }: Props) => {
  const client = useApolloClient()

  useEffect(() => {
    ;(async () => {
      const isPinEnabled = await KeyStoreWrapper.getIsPinEnabled()

      if (
        (await BiometricWrapper.isSensorAvailable()) &&
        (await KeyStoreWrapper.getIsBiometricsEnabled())
      ) {
        navigation.replace("authentication", {
          screenPurpose: AuthenticationScreenPurpose.Authenticate,
          isPinEnabled,
        })
      } else if (isPinEnabled) {
        navigation.replace("pin", { screenPurpose: PinScreenPurpose.AuthenticatePin })
      } else {
        navigation.replace("Primary")
        showModalClipboardIfValidPayment(client)
      }
    })()
  }, [])

  return (
    <Screen
      style={styles.container}
      backgroundColor={palette.lightBlue}
      statusBar="light-content"
    >
      <Image style={styles.Logo} source={BitcoinBeachLogo} resizeMode="contain" />
    </Screen>
  )
}

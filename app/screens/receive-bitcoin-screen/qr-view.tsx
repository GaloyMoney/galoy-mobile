import LottieView from "lottie-react-native"
import * as React from "react"
import { useCallback, useMemo } from "react"
import { ActivityIndicator, Text, View } from "react-native"
import EStyleSheet from "react-native-extended-stylesheet"
import QRCode from "react-native-qrcode-svg"
import LightningSats from "@app/assets/icons/lightning-sats.png"
import LightningUsd from "@app/assets/icons/lightning-usd.png"
import OnchainSats from "@app/assets/icons/onchain-btc.png"
import { palette } from "../../theme/palette"
import {
  getFullUri as getFullUriUtil,
  TYPE_LIGHTNING_BTC,
  TYPE_BITCOIN_ONCHAIN,
  TYPE_LIGHTNING_USD,
} from "../../utils/wallet"

import successLottie from "../send-bitcoin-screen/success_lottie.json"
import ScreenBrightness from "react-native-screen-brightness"
import { isIos } from "@app/utils/helper"

const configByType = {
  [TYPE_LIGHTNING_BTC]: {
    copyToClipboardLabel: "ReceiveBitcoinScreen.copyClipboard",
    shareButtonLabel: "common.shareLightning",
    ecl: "L" as const,
    icon: "ios-flash",
  },
  [TYPE_LIGHTNING_USD]: {
    copyToClipboardLabel: "ReceiveBitcoinScreen.copyClipboard",
    shareButtonLabel: "common.shareLightning",
    ecl: "L" as const,
    icon: "ios-flash",
  },
  [TYPE_BITCOIN_ONCHAIN]: {
    copyToClipboardLabel: "ReceiveBitcoinScreen.copyClipboardBitcoin",
    shareButtonLabel: "common.shareBitcoin",
    ecl: "M" as const,
    icon: "logo-bitcoin",
  },
}

type Props = {
  data: string
  type: GetFullUriInput["type"]
  amount: GetFullUriInput["amount"]
  memo: GetFullUriInput["memo"]
  loading: boolean
  completed: boolean
  err: string
  size?: number
}

export const QRView = ({
  data,
  type,
  amount,
  memo,
  loading,
  completed,
  err,
  size = 300,
}: Props): JSX.Element => {
  const [brightnessInitial, setBrightnessInitial] = React.useState(0.5)

  React.useEffect(() => {
    const fn = async () => {
      // android required permission, and open the settings page for it
      // it's probably not worth the hurdle
      //
      // only doing the brightness for iOS for now
      //
      // only need     <uses-permission android:name="android.permission.WRITE_SETTINGS" tools:ignore="ProtectedPermissions"/>
      // in the manifest
      // see: https://github.com/robinpowered/react-native-screen-brightness/issues/38
      //
      if (!isIos) {
        return
      }

      // let hasPerm = await ScreenBrightness.hasPermission();

      // if(!hasPerm){
      //   ScreenBrightness.requestPermission();
      // }

      // only enter this loop when brightnessInitial is not set
      // if (!brightnessInitial && hasPerm) {
      if (!brightnessInitial) {
        ScreenBrightness.getBrightness().then((brightness: number) => {
          setBrightnessInitial(brightness)
          ScreenBrightness.setBrightness(1) // between 0 and 1
        })
      }
    }

    fn()
    return () => ScreenBrightness.setBrightness(brightnessInitial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isReady =
    !err &&
    (type === TYPE_LIGHTNING_BTC || type === TYPE_LIGHTNING_USD
      ? !loading && data !== ""
      : true)

  const getFullUri = useCallback(
    ({ input, uppercase = false, prefix = true }) =>
      getFullUriUtil({ type, amount, memo, input, uppercase, prefix }),
    [type, amount, memo],
  )

  const renderSuccessView = useMemo(() => {
    if (completed) {
      return (
        <LottieView
          source={successLottie}
          loop={false}
          autoPlay
          style={styles.lottie}
          resizeMode="cover"
        />
      )
    }
    return null
  }, [completed])

  const renderQRCode = useMemo(() => {
    const getQrLogo = () => {
      if (type === TYPE_LIGHTNING_BTC) return LightningSats
      if (type === TYPE_LIGHTNING_USD) return LightningUsd
      if (type === TYPE_BITCOIN_ONCHAIN) return OnchainSats
      return null
    }

    if (!completed && isReady) {
      return (
        <>
          <View style={styles.qrBackround}>
            <QRCode
              size={size}
              value={getFullUri({ input: data, uppercase: true })}
              logoBackgroundColor="white"
              ecl={configByType[type].ecl}
              logo={getQrLogo()}
              logoSize={60}
              logoBorderRadius={10}
            />
          </View>
        </>
      )
    }
    return null
  }, [completed, isReady, type, size, getFullUri, data])

  const renderStatusView = useMemo(() => {
    if (!completed && !isReady) {
      return (
        <View style={styles.errorContainer}>
          {(err !== "" && (
            // eslint-disable-next-line react-native/no-inline-styles
            <Text style={{ color: palette.red, alignSelf: "center" }} selectable>
              {err}
            </Text>
          )) || <ActivityIndicator size="large" color={palette.blue} />}
        </View>
      )
    }
    return null
  }, [err, isReady, completed])

  return (
    <>
      <View style={styles.qr}>
        {renderSuccessView}
        {renderQRCode}
        {renderStatusView}
      </View>
    </>
  )
}

const styles = EStyleSheet.create({
  errorContainer: {
    alignContent: "center",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: palette.white,
    height: 280,
    justifyContent: "center",
    width: 280,
  },

  lottie: {
    height: "200rem",
    width: "200rem",
  },

  qr: {
    alignItems: "center",
  },
  qrBackround: {
    backgroundColor: palette.white,
    padding: 20,
    borderRadius: 10,
  },
})

export default React.memo(QRView)

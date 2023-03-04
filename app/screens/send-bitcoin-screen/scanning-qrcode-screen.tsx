import * as React from "react"
import {
  Alert,
  Dimensions,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native"
import EStyleSheet from "react-native-extended-stylesheet"
import ImagePicker from "react-native-image-crop-picker"
import Reanimated from "react-native-reanimated"
import Svg, { Circle } from "react-native-svg"
import Icon from "react-native-vector-icons/Ionicons"
import {
  Camera,
  CameraPermissionStatus,
  useCameraDevices,
} from "react-native-vision-camera"
import RNQRGenerator from "rn-qr-generator"
import { BarcodeFormat, useScanBarcodes } from "vision-camera-code-scanner"

import { gql } from "@apollo/client"
import {
  useRealtimePriceQuery,
  useScanningQrCodeScreenQuery,
  useUserDefaultWalletIdLazyQuery,
} from "@app/graphql/generated"
import { useIsAuthed } from "@app/graphql/is-authed-context"
import { useI18nContext } from "@app/i18n/i18n-react"
import { testProps } from "@app/utils/testProps"
import Clipboard from "@react-native-clipboard/clipboard"
import crashlytics from "@react-native-firebase/crashlytics"
import { useIsFocused } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"

import { Screen } from "../../components/screen"
import { RootStackParamList } from "../../navigation/stack-param-lists"
import { palette } from "../../theme/palette"
import { parseDestination } from "./payment-destination"
import { DestinationDirection } from "./payment-destination/index.types"
import { lnurlDomains } from "./send-bitcoin-destination-screen"

const { width: screenWidth } = Dimensions.get("window")

const styles = EStyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    marginTop: "5%",
    marginBottom: "10%",
  },

  close: {
    alignSelf: "flex-end",
    height: 64,
    marginRight: 16,
    marginTop: 40,
    width: 64,
  },

  closeIcon: {
    position: "absolute",
    top: -2,
  },

  openGallery: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: "5%",
    paddingRight: "5%",
    width: screenWidth,
  },

  // eslint-disable-next-line react-native/no-color-literals
  rectangle: {
    backgroundColor: "transparent",
    borderColor: palette.blue,
    borderWidth: 2,
    height: screenWidth * 0.65,
    width: screenWidth * 0.65,
  },

  rectangleContainer: {
    alignItems: "center",
    justifyContent: "center",
  },

  noPermissionsView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.black,
  },
})

type ScanningQRCodeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, "sendBitcoinDestination">
}

gql`
  query scanningQRCodeScreen {
    globals {
      network
    }
    me {
      id
      defaultAccount {
        id
        wallets {
          id
        }
      }
      contacts {
        id
        username
      }
    }
  }

  # TODO replace with AccountDefaultWallet?
  query userDefaultWalletId($username: Username!) {
    userDefaultWalletId(username: $username)
  }
`

export const ScanningQRCodeScreen: React.FC<ScanningQRCodeScreenProps> = ({
  navigation,
}) => {
  // forcing price refresh
  useRealtimePriceQuery({
    fetchPolicy: "network-only",
  })

  const [pending, setPending] = React.useState(false)

  const { data } = useScanningQrCodeScreenQuery({ skip: !useIsAuthed() })
  const wallets = data?.me?.defaultAccount.wallets
  const bitcoinNetwork = data?.globals?.network
  const [userDefaultWalletIdQuery] = useUserDefaultWalletIdLazyQuery({
    fetchPolicy: "no-cache",
  })

  const { LL } = useI18nContext()
  const devices = useCameraDevices()
  const [cameraPermissionStatus, setCameraPermissionStatus] =
    React.useState<CameraPermissionStatus>("not-determined")
  const isFocused = useIsFocused()
  const [frameProcessor, barcodes] = useScanBarcodes([BarcodeFormat.QR_CODE], {
    checkInverted: true,
  })
  const device = devices.back

  const requestCameraPermission = React.useCallback(async () => {
    const permission = await Camera.requestCameraPermission()
    if (permission === "denied") await Linking.openSettings()
    setCameraPermissionStatus(permission)
  }, [])

  React.useEffect(() => {
    if (cameraPermissionStatus !== "authorized") {
      requestCameraPermission()
    }
  }, [cameraPermissionStatus, navigation, requestCameraPermission])

  const decodeInvoice = React.useMemo(() => {
    return async (data: string) => {
      if (pending || !wallets || !bitcoinNetwork) {
        return
      }
      try {
        setPending(true)

        const destination = await parseDestination({
          rawInput: data,
          myWalletIds: wallets.map((wallet) => wallet.id),
          bitcoinNetwork,
          lnurlDomains,
          userDefaultWalletIdQuery,
        })

        if (destination.valid) {
          if (destination.destinationDirection === DestinationDirection.Send) {
            return navigation.navigate("sendBitcoinDetails", {
              paymentDestination: destination,
            })
          }

          return navigation.reset({
            routes: [
              {
                name: "Primary",
              },
              {
                name: "redeemBitcoinDetail",
                params: {
                  receiveDestination: destination,
                },
              },
            ],
          })
        }

        Alert.alert(
          LL.ScanningQRCodeScreen.invalidTitle(),
          LL.ScanningQRCodeScreen.invalidContent({
            found: data.toString(),
          }),
          [
            {
              text: LL.common.ok(),
              onPress: () => setPending(false),
            },
          ],
        )
      } catch (err: unknown) {
        if (err instanceof Error) {
          crashlytics().recordError(err)
          Alert.alert(err.toString(), "", [
            {
              text: LL.common.ok(),
              onPress: () => setPending(false),
            },
          ])
        }
      }
    }
  }, [
    LL.ScanningQRCodeScreen,
    LL.common,
    navigation,
    pending,
    bitcoinNetwork,
    wallets,
    userDefaultWalletIdQuery,
  ])

  React.useEffect(() => {
    if (barcodes.length > 0 && barcodes[0].rawValue && isFocused) {
      decodeInvoice(barcodes[0].rawValue)
    }
  }, [barcodes, decodeInvoice, isFocused])

  const handleInvoicePaste = async () => {
    try {
      const data = await Clipboard.getString()
      decodeInvoice(data)
    } catch (err: unknown) {
      if (err instanceof Error) {
        crashlytics().recordError(err)
        Alert.alert(err.toString())
      }
    }
  }

  const showImagePicker = async () => {
    try {
      const response = await ImagePicker.openPicker({})
      let qrCodeValues
      if (Platform.OS === "ios" && response.sourceURL) {
        qrCodeValues = await RNQRGenerator.detect({ uri: response.sourceURL })
      }
      if (Platform.OS === "android" && response.path) {
        qrCodeValues = await RNQRGenerator.detect({ uri: response.path })
      }
      if (qrCodeValues && qrCodeValues.values.length > 0) {
        decodeInvoice(qrCodeValues.values[0])
      } else {
        Alert.alert(LL.ScanningQRCodeScreen.noQrCode())
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        crashlytics().recordError(err)
        Alert.alert(err.toString())
      }
    }
  }

  if (cameraPermissionStatus !== "authorized") {
    return <View style={styles.noPermissionsView} />
  }

  return (
    <Screen unsafe>
      <View accessible={false} style={styles.container}>
        {device && (
          <Reanimated.View style={StyleSheet.absoluteFill}>
            <Camera
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isFocused}
              frameProcessor={frameProcessor}
              frameProcessorFps={5}
            />
          </Reanimated.View>
        )}
        <Pressable onPress={navigation.goBack}>
          <View style={styles.close}>
            <Svg viewBox="0 0 100 100">
              <Circle cx={50} cy={50} r={50} fill={palette.white} opacity={0.5} />
            </Svg>
            <Icon
              name="ios-close"
              size={64}
              style={styles.closeIcon}
              {...testProps("close-camera-button")}
            />
          </View>
        </Pressable>

        <View style={styles.rectangleContainer}>
          <View style={styles.rectangle} />
        </View>

        <View accessible={false} style={styles.openGallery}>
          <Pressable accessible={false} onPress={showImagePicker}>
            <Icon
              name="image"
              size={64}
              color={palette.lightGrey}
              // eslint-disable-next-line react-native/no-inline-styles
              style={{ opacity: 0.8 }}
            />
          </Pressable>
          <Pressable onPress={handleInvoicePaste}>
            {/* we could Paste from "FontAwesome" but as svg*/}
            <Text {...testProps("paste-invoice-button")}>
              <Icon
                name="ios-clipboard-outline"
                size={64}
                color={palette.lightGrey}
                // eslint-disable-next-line react-native/no-inline-styles
                style={{ opacity: 0.8, position: "absolute", bottom: "5%", right: "15%" }}
              />
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  )
}

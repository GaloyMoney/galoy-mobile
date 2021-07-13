import { useApolloClient, useReactiveVar } from "@apollo/client"
import Clipboard from "@react-native-community/clipboard"
import { useNavigation } from "@react-navigation/native"
import * as React from "react"
import { StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native"
import { Button } from "react-native-elements"
import Modal from "react-native-modal"
import { SafeAreaView } from "react-native-safe-area-context"
import Icon from "react-native-vector-icons/Ionicons"

import { modalClipboardVisibleVar } from "../../graphql/query"
import { translate } from "../../i18n"
import { color } from "../../theme"
import { palette } from "../../theme/palette"
import { validPayment } from "../../utils/parsing"
import { Token } from "../../utils/token"
import { saveString } from "../../utils/storage"

export const LAST_CLIPBOARD_PAYMENT = "last_clipboard_payment"

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignContent: "stretch",
  },

  buttonStyle: {
    backgroundColor: color.primary,
    marginHorizontal: 20,
    marginVertical: 10,
    width: 145,
  },

  icon: {
    height: 40,
    top: -40,
  },

  iconContainer: {
    height: 14,
  },

  message: {
    fontSize: 18,
    marginVertical: 8,
  },

  modal: {
    flexGrow: 1,
    marginBottom: 0,
    marginHorizontal: 0,
  },

  modalBackground: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-around",
  },

  modalForeground: {
    alignItems: "center",
    backgroundColor: palette.white,
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  touchable: {
    height: "100%",
    width: "100%",
  },
})

export const ModalClipboard = () => {
  const client = useApolloClient()
  const navigation = useNavigation()

  const open = async () => {
    modalClipboardVisibleVar(false)
    navigation.navigate("sendBitcoin", { payment: await Clipboard.getString() })
  }

  const dismiss = async () => {
    modalClipboardVisibleVar(false)
    saveString(LAST_CLIPBOARD_PAYMENT, await Clipboard.getString())
  }
  const [message, setMessage] = React.useState("")

  const isVisible = useReactiveVar(modalClipboardVisibleVar)

  React.useEffect(() => {
    if (!isVisible) {
      return
    }

    ;(async () => {
      const clipboard = await Clipboard.getString()
      const { paymentType } = validPayment(clipboard, new Token().network, client)
      const pathString =
        paymentType === "lightning"
          ? "ModalClipboard.pendingInvoice"
          : "ModalClipboard.pendingBitcoin"
      setMessage(translate(pathString))
    })()
  }, [isVisible])

  return (
    <Modal
      // transparent={true}
      swipeDirection={["down"]}
      isVisible={isVisible}
      onSwipeComplete={dismiss}
      swipeThreshold={50}
      propagateSwipe
      style={styles.modal}
    >
      <View style={styles.modalBackground}>
        <TouchableWithoutFeedback onPress={dismiss}>
          <View style={styles.touchable} />
        </TouchableWithoutFeedback>
      </View>
      <SafeAreaView style={styles.modalForeground}>
        <View style={styles.iconContainer}>
          <Icon
            name="ios-remove"
            size={72}
            color={palette.lightGrey}
            style={styles.icon}
          />
        </View>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttonContainer}>
          <Button title="Dismiss" onPress={dismiss} buttonStyle={styles.buttonStyle} />
          <Button title="Open" onPress={open} buttonStyle={styles.buttonStyle} />
        </View>
      </SafeAreaView>
    </Modal>
  )
}

import Clipboard from "@react-native-community/clipboard"
import { ApolloClient } from "@apollo/client"

import { validPayment } from "./parsing"
import { modalClipboardVisibleVar, walletIsActive } from "../graphql/query"
import { Token } from "./token"
import { loadString, saveString } from "./storage"

// eslint-disable-next-line @typescript-eslint/ban-types
export const checkClipboard = async (client: ApolloClient<object>): Promise<void> => {
  const LAST_CLIPBOARD_PAYMENT = "lastClipboardPayment"
  const clipboard = await Clipboard.getString()

  if (!walletIsActive(client)) {
    return
  }

  if (clipboard === (await loadString(LAST_CLIPBOARD_PAYMENT))) {
    return
  }

  const { valid } = validPayment(clipboard, new Token().network, client)
  if (!valid) {
    return
  }

  modalClipboardVisibleVar(true)
  saveString(LAST_CLIPBOARD_PAYMENT, clipboard)
}

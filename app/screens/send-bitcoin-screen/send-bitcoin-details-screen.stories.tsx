import { MockedProvider } from "@apollo/client/testing"
import { PaymentType } from "@galoymoney/client/dist/parsing-v2"
import { ComponentMeta } from "@storybook/react"
import React from "react"
import { PersistentStateWrapper, StoryScreen } from "../../../.storybook/views"
import { createCache } from "../../graphql/cache"
import { WalletCurrency } from "../../graphql/generated"
import { IsAuthedContextProvider } from "../../graphql/is-authed-context"
import SendBitcoinDetailsScreen from "./send-bitcoin-details-screen"
import mocks from "../../graphql/mocks"
import {
  CreatePaymentDetailParams,
  DestinationDirection,
  PaymentDestination,
  ResolvedIntraledgerPaymentDestination,
} from "./payment-destination/index.types"
import { createIntraledgerPaymentDetails, PaymentDetail } from "./payment-details"
import { RouteProp } from "@react-navigation/native"
import { RootStackParamList } from "@app/navigation/stack-param-lists"
import { palette } from "@app/theme"
import { View, StyleSheet } from "react-native"

const Styles = StyleSheet.create({
  sbView: {
    backgroundColor: palette.culturedWhite,
    height: "100%",
  },
})

export default {
  title: "SendBitcoinDetailsScreen",
  component: SendBitcoinDetailsScreen,
  decorators: [
    (Story) => (
      <IsAuthedContextProvider value={true}>
        <PersistentStateWrapper>
          <MockedProvider mocks={mocks} cache={createCache()}>
            <StoryScreen>
              <View style={Styles.sbView}>{Story()}</View>
            </StoryScreen>
          </MockedProvider>
        </PersistentStateWrapper>
      </IsAuthedContextProvider>
    ),
  ],
} as ComponentMeta<typeof SendBitcoinDetailsScreen>

const walletId = "f79792e3-282b-45d4-85d5-7486d020def5"
const handle = "test"

const validDestination: ResolvedIntraledgerPaymentDestination = {
  valid: true,
  walletId,
  paymentType: PaymentType.Intraledger,
  handle,
}

const createPaymentDetail = <T extends WalletCurrency>({
  sendingWalletDescriptor,
  convertMoneyAmount,
}: CreatePaymentDetailParams<T>): PaymentDetail<T> => {
  return createIntraledgerPaymentDetails({
    handle,
    recipientWalletId: walletId,
    sendingWalletDescriptor,
    convertMoneyAmount,
    unitOfAccountAmount: {
      amount: 0,
      currency: WalletCurrency.Btc,
    },
  })
}

const paymentDestination: PaymentDestination = {
  valid: true,
  validDestination,
  destinationDirection: DestinationDirection.Send,
  createPaymentDetail,
}

const route: RouteProp<RootStackParamList, "sendBitcoinDetails"> = {
  key: "sendBitcoinDetailsScreen",
  name: "sendBitcoinDetails",
  params: {
    paymentDestination,
  },
} as const

export const Intraledger = () => <SendBitcoinDetailsScreen route={route} storybook />

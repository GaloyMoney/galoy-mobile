import * as React from "react"

import { MockedProvider } from "@apollo/client/testing"
import { Meta } from "@storybook/react"

import { StoryScreen } from "../../../.storybook/views"
import { createCache } from "../../graphql/cache"
import { SettingsScreenDocument } from "../../graphql/generated"
import { AccountLevel, LevelContextProvider } from "../../graphql/level-context"
import mocks from "../../graphql/mocks"
import { AccountScreen } from "../settings-screen/account/account-screen"

const mocksLevelOne = [
  ...mocks,
  {
    request: {
      query: SettingsScreenDocument,
    },
    result: {
      data: {
        me: {
          id: "70df9822-efe0-419c-b864-c9efa99872ea",
          phone: "+50365055539",
          email: {
            address: "test@galoy.io",
            verified: false,
          },
          defaultAccount: {
            id: "84b26b88-89b0-5c6f-9d3d-fbead08f79d8",
            level: "ONE",
            wallets: [
              {
                id: "f79792e3-282b-45d4-85d5-7486d020def5",
                balance: 88413,
                walletCurrency: "BTC",
                __typename: "BTCWallet",
              },
              {
                id: "f091c102-6277-4cc6-8d81-87ebf6aaad1b",
                balance: 158,
                walletCurrency: "USD",
                __typename: "UsdWallet",
              },
            ],
            __typename: "ConsumerAccount",
          },
          __typename: "User",
        },
      },
    },
  },
]

const mocksNoEmail = [
  ...mocks,
  {
    request: {
      query: SettingsScreenDocument,
    },
    result: {
      data: {
        me: {
          id: "70df9822-efe0-419c-b864-c9efa99872ea",
          phone: "+50365055539",
          email: {
            address: null, // verify type returned by graphql
            verified: false,
          },
          defaultAccount: {
            id: "84b26b88-89b0-5c6f-9d3d-fbead08f79d8",
            level: "ONE",
            wallets: [
              {
                id: "f79792e3-282b-45d4-85d5-7486d020def5",
                balance: 88413,
                walletCurrency: "BTC",
                __typename: "BTCWallet",
              },
              {
                id: "f091c102-6277-4cc6-8d81-87ebf6aaad1b",
                balance: 158,
                walletCurrency: "USD",
                __typename: "UsdWallet",
              },
            ],
            __typename: "ConsumerAccount",
          },
          __typename: "User",
        },
      },
    },
  },
]

export default {
  title: "AccountScreen",
  component: AccountScreen,
  decorators: [(Story) => <StoryScreen>{Story()}</StoryScreen>],
} as Meta<typeof AccountScreen>

export const Unauthed = () => (
  <LevelContextProvider
    value={{
      isAtLeastLevelZero: false,
      isAtLeastLevelOne: false,
      isAtLeastLevelTwo: true,
      currentLevel: AccountLevel.NonAuth,
    }}
  >
    <MockedProvider cache={createCache()}>
      <AccountScreen />
    </MockedProvider>
  </LevelContextProvider>
)

export const AuthedEmailNotSet = () => (
  <LevelContextProvider
    value={{
      isAtLeastLevelZero: true,
      isAtLeastLevelOne: true,
      isAtLeastLevelTwo: true,
      currentLevel: AccountLevel.One,
    }}
  >
    <MockedProvider cache={createCache()} mocks={mocksNoEmail}>
      <AccountScreen />
    </MockedProvider>
  </LevelContextProvider>
)

export const AuthedEmailSet = () => (
  <LevelContextProvider
    value={{
      isAtLeastLevelZero: true,
      isAtLeastLevelOne: true,
      isAtLeastLevelTwo: true,
      currentLevel: AccountLevel.One,
    }}
  >
    <MockedProvider cache={createCache()} mocks={mocksLevelOne}>
      <AccountScreen />
    </MockedProvider>
  </LevelContextProvider>
)

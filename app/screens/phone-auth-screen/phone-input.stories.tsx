import React from "react"
import { ComponentMeta } from "@storybook/react"
import { PhoneInputScreen } from "./phone-input"
import { MockedProvider } from "@apollo/client/testing"
import { createCache } from "../../graphql/cache"
import { StoryScreen } from "../../../.storybook/views"
import { PersistentStateContext } from "../../store/persistent-state"

const mocks = []

const PersistentStateWrapper = ({ children }) => (<PersistentStateContext.Provider
value={{ persistentState: {
    schemaVersion: 4,
    hasShownStableSatsWelcome: true,
    isUsdDisabled: false,
    galoyInstance: {
        name: "Local",
        graphqlUri: "",
        graphqlWsUri: "",
        posUrl: "",
        lnAddressHostname: ""
      },
    galoyAuthToken: "",
    isAnalyticsEnabled: true,
  }, updateState: () => {},
    resetState: () => {} }} >
    <>{children}</>
    </PersistentStateContext.Provider>)

export default {
    title: "PhoneInputScreen",
    component: PhoneInputScreen,
    decorators: [
      (Story) => <PersistentStateWrapper><MockedProvider mocks={mocks} cache={createCache()}><StoryScreen>{Story()}</StoryScreen></MockedProvider></PersistentStateWrapper>
    ]
  } as ComponentMeta<typeof PhoneInputScreen>
  
export const Main = () => <PhoneInputScreen />

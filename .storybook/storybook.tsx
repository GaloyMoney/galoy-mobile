import React from "react"
import { getStorybookUI } from "@storybook/react-native"

import { NavigationContainer } from "@react-navigation/native"
import { ThemeProvider } from "@rneui/themed"
import { createStackNavigator } from "@react-navigation/stack"
import theme from "@app/rne-theme/theme"

// import './doctools'

// storybook.requires.js auto generated by storybook
// eslint-disable-next-line import/no-unresolved
import "./storybook.requires"

const StorybookUI = getStorybookUI({
  port: 9001,
  host: "localhost",
  onDeviceUI: true,
})

const Stack = createStackNavigator()

export const StorybookUIRoot: React.FC = () => (
  <ThemeProvider theme={theme}>
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={StorybookUI} />
      </Stack.Navigator>
    </NavigationContainer>
  </ThemeProvider>
)

import React, { useState } from "react"
import { Alert } from "react-native"

import useLogout from "@app/hooks/use-logout"
import { useI18nContext } from "@app/i18n/i18n-react"
import { toastShow } from "@app/utils/toast"
import { CommonActions, useNavigation } from "@react-navigation/native"

import { NetworkErrorCode } from "./error-code"
import { useNetworkError } from "./network-error-context"

export const NetworkErrorComponent: React.FC = () => {
  const navigation = useNavigation()

  const { networkError, clearNetworkError } = useNetworkError()
  const { LL } = useI18nContext()
  const { logout } = useLogout()

  const [showedAlert, setShowedAlert] = useState(false)

  React.useEffect(() => {
    if (!networkError || !("statusCode" in networkError)) {
      return
    }

    if (networkError.statusCode >= 500) {
      // TODO translation
      toastShow({
        message: (translations) => translations.errors.network.server(),
        LL,
      })

      return
    }

    if (networkError.statusCode >= 400 && networkError.statusCode < 500) {
      let errorCode =
        "result" in networkError && typeof networkError.result !== "string"
          ? networkError.result?.errors?.[0]?.code
          : undefined

      if (!errorCode) {
        switch (networkError.statusCode) {
          case 401:
            errorCode = NetworkErrorCode.InvalidAuthentication
            break
        }
      }

      switch (errorCode) {
        case NetworkErrorCode.InvalidAuthentication:
          logout()

          if (!showedAlert) {
            setShowedAlert(true)
            Alert.alert(LL.common.reauth(), "", [
              {
                text: LL.common.ok(),

                onPress: () => {
                  setShowedAlert(false)
                  navigation.dispatch(() => {
                    const routes = [{ name: "getStarted" }]
                    return CommonActions.reset({
                      routes,
                      index: routes.length - 1,
                    })
                  })
                },
              },
            ])
          }
          break

        default:
          // TODO translation
          toastShow({
            message: (translations) =>
              `StatusCode: ${
                networkError.statusCode
              }\nError code: ${errorCode}\n${translations.errors.network.request()}`,
            LL,
          })
          break
      }

      clearNetworkError()
      return
    }

    if (networkError.message === "Network request failed") {
      // TODO translation
      toastShow({
        message: (translations) => translations.errors.network.connection(),
        LL,
      })
    }
    clearNetworkError()
  }, [
    networkError,
    clearNetworkError,
    LL,
    logout,
    showedAlert,
    setShowedAlert,
    navigation,
  ])

  return <></>
}

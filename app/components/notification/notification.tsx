import { useApolloClient } from "@apollo/client"
import { useIsAuthed } from "@app/graphql/is-authed-context"
import { addDeviceToken, hasNotificationPermission } from "@app/utils/notifications"
import messaging, { FirebaseMessagingTypes } from "@react-native-firebase/messaging"
import React, { useEffect } from "react"

export const NotificationComponent = (): JSX.Element => {
  const client = useApolloClient()
  const isAuthed = useIsAuthed()

  const showNotification = (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    if (remoteMessage.notification?.body) {
      // TODO: add notifee library to show local notifications
      console.log(remoteMessage.notification.title || "", remoteMessage.notification.body)
    }
  }

  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      console.debug("onMessage")
      showNotification(remoteMessage)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    ;(async () => {
      if (isAuthed && client) {
        const hasPermission = await hasNotificationPermission()
        if (hasPermission) {
          addDeviceToken(client)
          messaging().onTokenRefresh(() => addDeviceToken(client))
        }
      }
    })()
  }, [client, isAuthed])

  return <></>
}

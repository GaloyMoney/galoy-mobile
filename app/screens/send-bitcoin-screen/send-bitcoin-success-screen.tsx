import React, { useEffect } from "react"

import { GaloyIcon } from "@app/components/atomic/galoy-icon"
import { Screen } from "@app/components/screen"
import {
  SuccessIconAnimation,
  SuccessTextAnimation,
} from "@app/components/success-animation"
import { useI18nContext } from "@app/i18n/i18n-react"
import { RootStackParamList } from "@app/navigation/stack-param-lists"
import { useNavigation } from "@react-navigation/native"
import { StackNavigationProp } from "@react-navigation/stack"
import { makeStyles, Text, useTheme } from "@rneui/themed"
import { View, TextInput } from "react-native"
import { testProps } from "../../utils/testProps"
import Modal from "react-native-modal"
import { GaloySecondaryButton } from "../../components/atomic/galoy-secondary-button"
import Rate from "react-native-rate"
import { ratingOptions } from "@app/config"
import crashlytics from "@react-native-firebase/crashlytics"
import { isIos } from "@app/utils/helper"
import AsyncStorage from "@react-native-async-storage/async-storage"

const SendBitcoinSuccessScreen = () => {
  const styles = useStyles()
  const {
    theme: { colors },
  } = useTheme()
  const [IsActive, setIsActive] = React.useState(false)

  const [showImprovement, setshowImprovement] = React.useState(false)
  const [token, setToken] = React.useState("")
  const [improvement, setImprovement] = React.useState("")
  const navigation =
    useNavigation<StackNavigationProp<RootStackParamList, "sendBitcoinSuccess">>()

  const submitImprovement = async () => {
    const savedToken = await AsyncStorage.getItem("mattermostToken")
    if (savedToken === "") {
      const response = await fetch("https://chat.galoy.io/api/v4/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // eslint-disable-next-line camelcase
          login_id: "username",
          password: "password",
        }),
      })

      if (response.ok) {
        const newToken = response.headers.get("Token")
        setToken(newToken ?? "")
        await AsyncStorage.setItem("mattermostToken", newToken ?? "")
      }
    } else {
      setToken(savedToken ?? "")
    }

    await fetch("https://chat.galoy.io/api/v4/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        // eslint-disable-next-line camelcase
        channel_id: "n59hg9abetdrtygof11kncjbdw",
        message: improvement,
      }),
    }).then(() => {
      setshowImprovement(false)
    })
  }

  const dismiss = () => {
    setIsActive(false)
    return showSuggestionModal
  }

  const dismissSuggestionModal = () => {
    setshowImprovement(false)
    navigation.popToTop()
  }

  const rateUs = () => {
    Rate.rate(ratingOptions, (success, errorMessage) => {
      if (success) {
        crashlytics().log("User went to the review page")
      }
      if (errorMessage) {
        crashlytics().recordError(new Error(errorMessage))
      }
    })
  }

  const { LL } = useI18nContext()
  const FEEDBACK_DELAY = 3000
  useEffect(() => {
    const feedbackTimeout = setTimeout(() => setIsActive(true), FEEDBACK_DELAY)
    return () => {
      clearTimeout(feedbackTimeout)
    }
  }, [])

  const showFeedbackModal = () => {
    return (
      <Modal
        isVisible={IsActive}
        onBackdropPress={dismiss}
        backdropOpacity={0.3}
        backdropColor={colors.grey3}
        avoidKeyboard={true}
      >
        <View style={styles.view}>
          <Text type="h1">Enjoying the app?</Text>
          <GaloySecondaryButton
            title={LL.SettingsScreen.rateUs({
              storeName: isIos ? "App Store" : "Play Store",
            })}
            onPress={rateUs}
          />
        </View>
      </Modal>
    )
  }

  const showSuggestionModal = () => {
    return (
      <Modal
        isVisible={showImprovement}
        onBackdropPress={dismissSuggestionModal}
        backdropOpacity={0.3}
        backdropColor={colors.grey3}
      >
        <View style={styles.view}>
          <Text type="h1">
            Thankyou for the feedback, would you like to like to suggest and improvement?
          </Text>
          <View>
            <TextInput
              style={styles.noteInput}
              placeholder={LL.SendBitcoinScreen.note()}
              onChangeText={(improvement: React.SetStateAction<string>) =>
                setImprovement(improvement)
              }
              value={improvement}
              multiline={true}
              numberOfLines={3}
              autoFocus
            />
            <GaloySecondaryButton
              title={LL.common.submit()}
              onPress={submitImprovement}
            />
          </View>
        </View>
      </Modal>
    )
  }
  return (
    <Screen preset="scroll" style={styles.contentContainer}>
      <View style={styles.Container}>
        <SuccessIconAnimation>
          <GaloyIcon name={"payment-success"} size={128} />
        </SuccessIconAnimation>
        <SuccessTextAnimation>
          <Text {...testProps("Success Text")} style={styles.successText}>
            {LL.SendBitcoinScreen.success()}
          </Text>
        </SuccessTextAnimation>
        {IsActive && showFeedbackModal()}
        {showImprovement && showSuggestionModal()}
      </View>
    </Screen>
  )
}

const useStyles = makeStyles(({ colors }) => ({
  contentContainer: {
    flexGrow: 1,
  },
  successText: {
    fontSize: 18,
    textAlign: "center",
    marginTop: 20,
  },
  Container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  flex: {
    maxHeight: "25%",
    flex: 1,
  },
  view: {
    marginHorizontal: 20,
    backgroundColor: colors.white,
    padding: 20,
    borderRadius: 20,
  },
  noteInput: {
    color: colors.black,
  },
}))

export default SendBitcoinSuccessScreen

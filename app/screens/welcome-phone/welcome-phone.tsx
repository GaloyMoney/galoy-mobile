import { Screen } from "../../components/screen"

import * as React from "react"
import { useState, useEffect } from "react"
import { Text } from "../../components/text"
import { StyleSheet, View, Image, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { Button } from 'react-native-elements'
import { bowserLogo } from "."
import { withNavigation } from 'react-navigation';
import { TextInput, ScrollView } from "react-native-gesture-handler"
import functions from "@react-native-firebase/functions"
import { color } from "../../theme"
import { saveString } from "../../utils/storage"
import { Loader } from "../../components/loader"

import auth from '@react-native-firebase/auth';
import { OnboardingSteps } from "../loading-screen"
 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },

  image: {
    alignSelf: 'center',
    padding: 20,
  },

  text: {
    fontSize: 20,
    textAlign: "center",
    paddingHorizontal: 40,
    paddingBottom: 10,
  },

  textEntry: {
    fontSize: 20,
    textAlign: "center",
    marginHorizontal: 60,
    padding: 12,
    borderColor: color.palette.darkGrey,
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 10,
    color: color.palette.darkGrey,
  },

  buttonContainer: {
    paddingHorizontal: 80,
    paddingVertical: 10,
  },

  buttonStyle: {
    backgroundColor: color.primary
  },

  modalBackground: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'space-around',
    backgroundColor: '#00000040'
  },
  activityIndicatorWrapper: {
    backgroundColor: '#FFFFFF',
    height: 100,
    width: 100,
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around'
  }
})


export const WelcomePhoneInputScreen = withNavigation(({ text, next, navigation, header = "" }) => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [confirmation, setConfirmation] = useState({});
  
  const send = async () => {
    setLoading(true)
    console.tron.log('initPhoneNumber')

    try {
      if (phone === "") {
        Alert.alert('need a phone number')
        return
      }

      const conf = await auth().signInWithPhoneNumber(phone)
      setConfirmation(conf);
      console.tron.log(`confirmation`, conf)
      console.log(`confirmation`, conf)

      // const result = await functions().httpsCallable('initPhoneNumber')({phone})
      // console.tron.log(result)
      setCompleted(true)
      console.tron.log('WelcomePhoneInputScreen succesfully completed')
    } catch (err) {
      // TODO find a way to easily log in Reactotron and Xcode
      console.tron.error('error with initPhoneNumber')
      console.tron.error(err)
      console.error('error with initPhoneNumber')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if(completed) { // FIXME: race condition possible between completed and confirmation?
      navigation.navigate(next, {phone, confirmation})
    }
  }, [completed]);

  header="To receive your sats, first we need to activate your Bitcoin wallet." 
  text="This will take a little while, but we’ll send you a text you when it’s ready!" 
  next="welcomePhoneValidation" 

  return (
    <Screen>
      <Loader loading={loading} />
      <KeyboardAvoidingView
        keyboardVerticalOffset={-110}
        behavior={(Platform.OS === 'ios')? "padding" : undefined}
        style={{ flex: 1}} >
          <View style={{flex: 1, justifyContent: "flex-end" }}>
          <View style={{ flex : 1 }} />
          <Text style={styles.text}>{header}</Text>
          <Image source={bowserLogo} height={100} />
          <Text style={styles.text}>{text}</Text>
          <TextInput  style={styles.textEntry} 
                      onChangeText={input => (setPhone(input))}
                      keyboardType="phone-pad"
                      textContentType="telephoneNumber"
                      placeholder="Phone Number"
                      maxLength={12}
                      >
                        {phone}
          </TextInput>
          <View style={{ flex : 1 }} />
          <Button title="Next" 
                    onPress={() => send()} 
                    containerStyle={styles.buttonContainer}
                    buttonStyle={styles.buttonStyle}
                    />
          </View>
      </KeyboardAvoidingView>
    </Screen>
  )
})

export const WelcomePhoneValidationScreen = withNavigation(({ text, next, navigation, header = "" }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const phone = navigation.getParam('phone')

  const onAuthStateChanged = async (user) => { // TODO : User type
    console.tron.log(`onAuthStateChanged`, user)
    console.log(`onAuthStateChanged`, user)
    if (user === null) {
      return
    }

    if (user.phoneNumber) {
      await saveString('onboarding', OnboardingSteps.phoneVerified)
      setCompleted(true)
    }
  }

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged)
    return subscriber; // unsubscribe on unmount
  }, [])

  const sendVerif = async () => {
    setLoading(true)

    try {
      const data = {code, phone}
      console.tron.log('verifyPhoneNumber', data)
  
      if (code === "") {
        Alert.alert('need a code')
        return
      }
  
      try {
        let confirmation = navigation.getParam('confirmation');
        confirmation.confirm(code);
      } catch (err) {
        Alert.alert(err)
        console.tron.error(err); // Invalid code
      }

    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    if(completed) {
      console.tron.log('navigation to welcome')
      navigation.navigate("welcomeSyncing")
    }
  }, [completed]);

  text="To confirm your phone number, enter the code we just sent you." 

  return (
    <Screen>
      <Loader loading={loading} />
      <KeyboardAvoidingView
        keyboardVerticalOffset={-80}
        behavior={(Platform.OS === 'ios')? "padding" : undefined}
          style={styles.container} >
        <ScrollView>
          <View style={{ flex : 1 }} />
          <Text style={styles.text}>{header}</Text>
          <Image source={bowserLogo} />
          <Text style={styles.text}>{text}</Text>
          <TextInput  style={styles.textEntry} 
                      onChangeText={input => (setCode(input))}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      placeholder="6 Digits Code"
                      >
                        {code}
          </TextInput>
          <View style={{ flex : 1 }} />
          <Button title="Next" 
                  onPress={() => sendVerif()} 
                  containerStyle={styles.buttonContainer}
                  buttonStyle={styles.buttonStyle}
                  />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  )
})

import * as React from "react"
import { StyleSheet, View, SafeAreaView, Text, Alert } from "react-native"
import { palette } from "../../theme/palette"
import Modal from "react-native-modal"
import { Button } from "react-native-elements"
import { color } from "../../theme"
import Icon from "react-native-vector-icons/Ionicons"

const styles = StyleSheet.create({
  modalText: {
    fontSize: 24,
    marginVertical: 12,
  },

  modalBackground: {
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    height: 400,
    backgroundColor: palette.white,
    alignItems: "center",
  },

  textButton: {
    backgroundColor: color.primary,
    marginVertical: 8,
  },
})

interface IQuizz {
  quizzVisible: boolean,
  setQuizzVisible(boolean): void,
  quizzData: {
    question: string,
    answers: string[],
    feedback: string[],
    correct: number,
  }, 
  close(msg): void,
}

export const Quizz = ({ quizzVisible, setQuizzVisible, quizzData, close }: IQuizz) => {
  return (
    <Modal
      style={{ marginHorizontal: 0, marginBottom: 0 }}
      isVisible={quizzVisible}
      swipeDirection={quizzVisible ? ["down"] : ["up"]}
      onSwipeComplete={() => setQuizzVisible(false)}
      swipeThreshold={50}
    >
      <View style={{ flex: 1 }}>
        {/* <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                    <View style={{flex: 1}}></View>
                </TouchableWithoutFeedback> */}
      </View>
      {quizzData.question !== undefined && (
        <View style={styles.modalBackground}>
          <Icon
            name={"ios-remove"}
            size={64}
            color={palette.lightGrey}
            style={{ height: 34, top: -22 }}
          />
          <SafeAreaView style={{ flex: 1 }}>
            <Text style={styles.modalText}>{quizzData.question}</Text>
            {quizzData.answers.map((l, i) => (
              <Button
                title={l}
                buttonStyle={styles.textButton}
                onPress={() => {
                  quizzData.correct === i ? close(quizzData.feedback[quizzData.correct]) : Alert.alert(quizzData.feedback[i])
                }}
                key={i}
              />
            ))}
          </SafeAreaView>
        </View>
      )}
    </Modal>
  )
}

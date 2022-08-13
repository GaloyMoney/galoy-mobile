import * as React from "react"
import { useState } from "react"
// eslint-disable-next-line react-native/split-platform-components
import {
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native"
import { Screen } from "../../components/screen"
import { color, fontSize, typography } from "@app/theme"
import { HeaderComponent } from "@app/components/header"
import { images } from "@app/assets/images"
import { eng } from "@app/constants/en"
import { useDispatch } from "react-redux"
import { setTempStore } from "@app/redux/reducers/store-reducer"
import DropDownPicker from "react-native-dropdown-picker"
import { MarketPlaceParamList } from "@app/navigation/stack-param-lists"
import { StackNavigationProp } from "@react-navigation/stack"
import { CustomTextInput } from "@app/components/text-input"
import TextInputComponent from "@app/components/text-input-component"
const { width, height } = Dimensions.get("window")
const IMAGE_WIDTH = width - 32 * 2
const IMAGE_HEIGHT = IMAGE_WIDTH * 0.635
interface Props {
  navigation: StackNavigationProp<MarketPlaceParamList>
}
export const CreatePostScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch()
  const [name, setName] = useState("")
  const [category, setCategory] = useState("Foods")
  const [description, setDescription] = useState(
    "",
  )
  const [nameError, setNameError] = useState('')
  const [descriptionError, setDescriptionError] = useState('')
  const [open, setOpen] = useState(false)
  const [items] = useState([
    { label: "Foods", value: "Foods" },
    { label: "Drinks", value: "Drinks" },
  ])
  const isCorrectInput = () => {
    let nameValid = false
    let descriptionValid = false
    console.log('name: ', name, description);

    if (!name) setNameError('Name is required')
    else if (name?.length < 2) setNameError('Name must be more than 2 characters')
    else {
      nameValid = true
      setNameError('')
    }

    if (!description) setDescriptionError('Description is required')
    else if (description?.length < 2) setDescriptionError('Description must be more than 2 characters')
    else {
      descriptionValid = true
      setDescriptionError('')
    }

    return (nameValid && descriptionValid) ? true : false
  }
  const onNext = () => {
    if (!isCorrectInput()) return
    dispatch(setTempStore({ name, description, category }))
    navigation.navigate("AddImage")
  }
  return (
    <Screen style={styles.container}
      keyboardOffset={"none"}
    //  preset="scroll"
    >
      <TouchableOpacity
        style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        onPress={() => { Keyboard.dismiss() }}
        activeOpacity={1}
      >
        <HeaderComponent style={{ paddingHorizontal: 20, width }} />
        <Image source={images.backgroundSimple} style={{ width: 177, height: 158 }} />
        <Text style={styles.title}>{eng.create_post}</Text>
        <View style={{ paddingHorizontal: 30, width: "100%" }}>
          <TextInputComponent
            title={"Name"}
            containerStyle={[{ marginTop: 40 }]}
            onChangeText={setName}
            value={name}
            placeholder={'Burger'}
            isError={nameError !== ''}
          />
          {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
          <Text style={styles.labelStyle}>Category</Text>
          <DropDownPicker
            style={styles.dropdownStyle}
            textStyle={{
              fontFamily: typography.regular,
              fontSize: fontSize.font16,
            }}
            dropDownContainerStyle={{ borderColor: "#EBEBEB" }}
            placeholder={"Category"}
            placeholderStyle={{ color: "#c0c0c0" }}
            open={open}
            value={category}
            items={items}
            setOpen={setOpen}
            setValue={setCategory}
          />
          <TextInputComponent
            title={"Price"}
            containerStyle={[{ marginTop: 40 }]}
            onChangeText={setName}
            value={name}
            placeholder={'Burger'}
            isError={nameError !== ''}
          />

          <TextInputComponent
            title={"Description"}
            placeholder={"Description ..."}
            containerStyle={[{ marginTop: 20 }]}
            textField={true}
            onChangeText={setDescription}
            value={description}
            isError={descriptionError !== ''}
          />
          {descriptionError ? <Text style={styles.errorText}>{descriptionError}</Text> : null}
          <View style={{ alignItems: "flex-end", marginTop: 15 }}>
            <TouchableOpacity
              style={styles.button}
              onPress={onNext}
            >
              <Text style={[styles.text]}>{eng.next}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Screen>

  )
}

const styles = StyleSheet.create({
  errorText: { fontFamily: typography.regular, fontSize: fontSize.font12, color: color.darkPink },
  dropdownStyle: {
    borderWidth: 1,
    borderColor: "#EBEBEB",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  textInputStyle: {
    borderWidth: 1,
    borderColor: "#EBEBEB",
    paddingVertical: 10,
    paddingHorizontal: 15,
    fontFamily: typography.regular,
    fontSize: fontSize.font16,
    borderRadius: 4,
  },
  labelStyle: {
    fontFamily: typography.regular,
    fontSize: fontSize.font16,
    marginVertical: 10,
  },
  text: {
    fontFamily: typography.medium,
    fontSize: fontSize.font16,
    color: "white",
  },
  button: {
    borderRadius: 20,
    paddingHorizontal: 25,
    paddingVertical: 7,
    backgroundColor: "#3653FE",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: typography.regular,
    fontWeight: "400",
    fontSize: fontSize.font20,
    marginTop: 10,
  },
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
  },
})

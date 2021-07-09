import React from "react"
import { Text, View } from "react-native"
import EStyleSheet from "react-native-extended-stylesheet"
import { palette } from "../../theme/palette"

const styles = EStyleSheet.create({
  description: {
    marginVertical: 12,
  },

  entry: {
    color: palette.midGrey,
    marginBottom: "6rem",
  },

  value: {
    color: palette.darkGrey,
    fontSize: "14rem",
    fontWeight: "bold",
  },
})

type RowProps = {
  entry: string
  value: string
}

export const Row = ({ entry, value }: RowProps) => (
  <View style={styles.description}>
    <Text style={styles.entry}>{entry}</Text>
    <Text selectable style={styles.value}>
      {value}
    </Text>
  </View>
)

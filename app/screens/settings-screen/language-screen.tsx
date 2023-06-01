import { gql } from "@apollo/client"
import { useLanguageQuery, useUserUpdateLanguageMutation } from "@app/graphql/generated"
import { useIsAuthed } from "@app/graphql/is-authed-context"
import { useI18nContext } from "@app/i18n/i18n-react"
import { LocaleToTranslateLanguageSelector } from "@app/i18n/mapping"
import { getLanguageFromString, Languages } from "@app/utils/locale-detector"
import * as React from "react"
import { Screen } from "../../components/screen"
import { testProps } from "../../utils/testProps"
import { Select, SelectItem } from "@app/components/select"

gql`
  query language {
    me {
      id
      language
    }
  }

  mutation userUpdateLanguage($input: UserUpdateLanguageInput!) {
    userUpdateLanguage(input: $input) {
      errors {
        message
      }
      user {
        id
        language
      }
    }
  }
`

export const LanguageScreen: React.FC = () => {
  const isAuthed = useIsAuthed()

  const { data } = useLanguageQuery({
    fetchPolicy: "cache-first",
    skip: !isAuthed,
  })

  const languageFromServer = getLanguageFromString(data?.me?.language)

  const [updateLanguage, { loading }] = useUserUpdateLanguageMutation()
  const { LL } = useI18nContext()

  const [newLanguage, setNewLanguage] = React.useState("")

  return (
    <Screen preset="scroll">
      <Select
        value={newLanguage || languageFromServer}
        onChange={async (language) => {
          if (loading) return
          await updateLanguage({ variables: { input: { language } } })
          setNewLanguage(language)
        }}
      >
        {Languages.map((language) => {
          let languageTranslated: string
          if (language === "DEFAULT") {
            languageTranslated = LL.Languages[language]()
          } else {
            languageTranslated = LocaleToTranslateLanguageSelector[language]
          }

          return (
            <SelectItem
              key={language}
              value={language}
              {...testProps(languageTranslated)}
            >
              {languageTranslated}
            </SelectItem>
          )
        })}
      </Select>
    </Screen>
  )
}

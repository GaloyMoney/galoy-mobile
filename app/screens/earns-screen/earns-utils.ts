import { TranslationFunctions } from "@app/i18n/i18n-types"
import { LocalizedString } from "typesafe-i18n"
import { EarnSectionType, earnSections } from "./sections"
import { QuizQuestion, QuizQuestionContent, QuizSectionContent } from "./earns-section"
import { MyQuizQuestions } from "../earns-map-screen"

export const getCardsFromSection = ({
  section,
  quizQuestionsContent,
}: {
  section: EarnSectionType
  quizQuestionsContent: QuizSectionContent[]
}) => {
  const quizzes = quizQuestionsContent.find((content) => section === content.section.id)
  return quizzes?.content.map((card) => card) || []
}

export const augmentCardWithGqlData = ({
  card,
  quizServerData,
}: {
  card: QuizQuestionContent
  quizServerData: MyQuizQuestions
}): QuizQuestion => {
  const myQuiz = quizServerData.find((quiz) => quiz.id === card.id)
  return {
    ...card,
    amount: myQuiz?.amount || 0,
    completed: myQuiz?.completed || false,
  }
}

export const sectionCompletedPct = ({
  quizServerData,
  section,
  quizQuestionsContent,
}: {
  quizServerData: MyQuizQuestions
  section: EarnSectionType
  quizQuestionsContent: QuizSectionContent[]
}): number => {
  const cardsOnSection = getCardsFromSection({
    section,
    quizQuestionsContent,
  })
  const cards = cardsOnSection.map((card) =>
    augmentCardWithGqlData({ card, quizServerData }),
  )

  try {
    return cards?.filter((item) => item?.completed).length / cards.length
  } catch (err) {
    console.error(err)
    return 0
  }
}

export const getQuizQuestionsContent = ({
  LL,
}: {
  LL: TranslationFunctions
}): QuizSectionContent[] => {
  const LLEarn = LL.EarnScreen.earnSections
  const quizSectionContent = (Object.keys(earnSections) as EarnSectionType[]).map(
    (sectionId) => ({
      section: {
        id: sectionId,
        title: LLEarn[sectionId].title(),
      },
      content: earnSections[sectionId].questions.map((question) => {
        // we would need more precise type to infer correctly the type here
        // because we are filtering with EarnSectionType, we are only looking through one section
        // at a time. but the questions are from all the types, so typescript
        // cant infer the type correctly
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const questions = (LLEarn[sectionId].questions as any)[question] as {
          answers: {
            "0": () => LocalizedString
            "1": () => LocalizedString
            "2": () => LocalizedString
          }
          feedback: {
            "0": () => LocalizedString
            "1": () => LocalizedString
            "2": () => LocalizedString
          }
          question: () => LocalizedString
          text: () => LocalizedString
          title: () => LocalizedString
          type: () => LocalizedString
        }

        return {
          id: question,
          title: questions.title(),
          text: questions.text(),
          question: questions.question(),
          answers: Object.values(questions.answers).map(
            // need to execute the function to get the value
            (answer) => (answer as () => LocalizedString)(),
          ),
          feedback: Object.values(questions.feedback).map(
            // need to execute the function to get the value
            (feedback) => (feedback as () => LocalizedString)(),
          ),
        }
      }),
    }),
  )
  return quizSectionContent
}

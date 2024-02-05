// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path")
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ts = require("typescript")

function extractKeysFromObjectLiteral(objLiteral, path = []) {
  let keys = []

  for (const property of objLiteral.properties) {
    if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name)) {
      const keyPath = [...path, property.name.text].join(".")
      keys.push(keyPath)

      if (ts.isObjectLiteralExpression(property.initializer)) {
        keys = keys.concat(
          extractKeysFromObjectLiteral(property.initializer, [
            ...path,
            property.name.text,
          ]),
        )
      }
    }
  }

  return keys
}

function parseLocalizationFile(filePath) {
  const fileContent = fs.readFileSync(filePath, "utf8")
  const sourceFile = ts.createSourceFile("en.ts", fileContent, ts.ScriptTarget.Latest)
  let keys = []

  sourceFile.forEachChild((node) => {
    if (ts.isVariableStatement(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.name.text === "en" &&
          ts.isObjectLiteralExpression(declaration.initializer)
        ) {
          keys = extractKeysFromObjectLiteral(declaration.initializer)
        }
      }
    }
  })

  return keys
}

// Function to recursively scan the codebase
function scanDirectory(directory, callback) {
  fs.readdirSync(directory).forEach((file) => {
    const fullPath = path.join(directory, file)
    if (fs.statSync(fullPath).isDirectory()) {
      scanDirectory(fullPath, callback)
    } else if (/\.(tsx?|jsx?)$/.test(fullPath)) {
      callback(fullPath)
    }
  })
}

// Main function to find unused keys
function findUnusedKeys() {
  const localizationKeys = parseLocalizationFile("app/i18n/en/index.ts")
  const usedKeys = new Set()

  scanDirectory("app", (filePath) => {
    const fileContent = fs.readFileSync(filePath, "utf8")
    localizationKeys.forEach((key) => {
      // Construct regex patterns to match function calls with any arguments
      const patterns = [
        `LL.${key}\\(.*?\\)`, // Matches LL.keyName(anything)
        `translate.${key}\\(.*?\\)`, // Matches translate.keyName(anything)
        `translations.${key}\\(.*?\\)`, // Matches translations.keyName(anything)
      ]

      // Check if any pattern matches the file content
      if (patterns.some((pattern) => new RegExp(pattern).test(fileContent))) {
        usedKeys.add(key)
      }
    })
  })

  const unusedKeys = localizationKeys
    .filter((key) => !usedKeys.has(key))
    .filter((key) => key.includes("."))
    // sections that have complex logic and not via LL.xxx in code
    .filter((key) => !key.includes("EarnScreen"))
    .filter((key) => !key.includes("NotificationSettingsScreen"))

  console.log("Unused Keys:", unusedKeys)
}

// Run the script
findUnusedKeys()

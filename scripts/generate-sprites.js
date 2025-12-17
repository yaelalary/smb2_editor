import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sizeOf from 'image-size'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SPRITES_DIR = path.join(__dirname, '../src/assets/sprites improved')
const OUTPUT_FILE = path.join(__dirname, '../src/sprites.js')
const CELL_SIZE = 16 // Each grid cell represents 16 pixels in the sprite

function toValidVariableName(str) {
  // Replace hyphens with underscores and keep underscores as is
  return str.replace(/-/g, '_')
}

function scanDirectory(dir, baseDir = dir) {
  const files = []

  const items = fs.readdirSync(dir, { withFileTypes: true })

  for (const item of items) {
    const fullPath = path.join(dir, item.name)

    if (item.isDirectory()) {
      // Recursively scan subdirectories
      files.push(...scanDirectory(fullPath, baseDir))
    } else if (/\.(png|jpg|jpeg|gif|webp)$/i.test(item.name)) {
      // Get relative path from base directory
      const relativePath = path.relative(baseDir, fullPath)
      files.push(relativePath)
    }
  }

  return files
}

function buildFolderStructure(files) {
  const structure = {}

  files.forEach((file) => {
    const parts = file.replace(/\\/g, '/').split('/')
    const fileName = parts[parts.length - 1]
    const folderPath = parts.slice(0, -1).join('/')

    if (!structure[folderPath]) {
      structure[folderPath] = []
    }
    structure[folderPath].push(fileName)
  })

  return structure
}

function generateSpritesFile() {
  // Scan all files recursively
  const files = scanDirectory(SPRITES_DIR).sort()

  if (files.length === 0) {
    console.error('No image files found in sprites directory!')
    process.exit(1)
  }

  const imports = []
  const spriteEntries = []
  const folderStructure = buildFolderStructure(files)

  files.forEach((file) => {
    const nameWithoutExt = path.basename(file, path.extname(file))
    // Replace hyphens with underscores in the key name
    const keyName = nameWithoutExt.replace(/-/g, '_')
    const varName = toValidVariableName(keyName)

    // Use forward slashes for import path
    const importPath = file.replace(/\\/g, '/')

    // Get folder path
    const parts = importPath.split('/')
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : ''

    // Generate import statement
    imports.push(`import ${varName} from './assets/sprites improved/${importPath}';`)

    // Calculate sprite size from image dimensions
    const fullPath = path.join(SPRITES_DIR, file)
    let w = 1
    let h = 1

    try {
      const buffer = fs.readFileSync(fullPath)
      const dimensions = sizeOf(buffer)
      w = Math.round(dimensions.width / CELL_SIZE)
      h = Math.round(dimensions.height / CELL_SIZE)

      // Ensure minimum size of 1x1
      w = Math.max(1, w)
      h = Math.max(1, h)
    } catch (error) {
      console.warn(`⚠️  Could not read dimensions for ${file}: ${error.message}`)
    }

    // Generate sprite entry with folder information
    spriteEntries.push(`  ${keyName}: { src: ${varName}, w: ${w}, h: ${h}, folder: '${folder}' },`)
  })

  // Build folder hierarchy
  const folders = {}
  Object.keys(folderStructure).forEach((folderPath) => {
    if (folderPath) {
      const parts = folderPath.split('/')
      parts.forEach((part, index) => {
        const currentPath = parts.slice(0, index + 1).join('/')
        if (!folders[currentPath]) {
          folders[currentPath] = {
            name: part,
            path: currentPath,
            parent: index > 0 ? parts.slice(0, index).join('/') : '',
          }
        }
      })
    }
  })

  // Generate the complete file content
  const fileContent = `${imports.join('\n')}

export const sprites = {
${spriteEntries.join('\n')}
};

export const spriteFolders = ${JSON.stringify(folders, null, 2)};
`

  // Write to output file
  fs.writeFileSync(OUTPUT_FILE, fileContent, 'utf8')

  console.log(`✅ Generated sprites.js with ${files.length} sprites`)
  console.log(`📁 Found ${Object.keys(folders).length} folders`)
  console.log(`📁 Source: ${SPRITES_DIR}`)
  console.log(`📄 Output: ${OUTPUT_FILE}`)
}

try {
  generateSpritesFile()
} catch (error) {
  console.error('❌ Error generating sprites file:', error)
  process.exit(1)
}

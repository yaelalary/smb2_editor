import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sizeOf from 'image-size'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const SPRITES_DIR = path.join(__dirname, '../src/assets/sprites improved')
const OUTPUT_FILE = path.join(__dirname, '../src/sprites.js')
const CELL_SIZE = 16 // Each grid cell represents 16 pixels in the sprite

function toValidVariableName(str) {
  // Replace hyphens with underscores and keep underscores as is
  return str.replace(/-/g, '_')
}

async function getDominantColor(imagePath, fileName) {
  try {
    // Get the image data without resizing to preserve original colors
    const data = await sharp(imagePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

    const pixels = data.data
    const colorMap = new Map() // Map from hex color to count
    let blackPixelCount = 0
    let totalPixelCount = 0

    // Count all non-transparent pixels
    for (let i = 0; i < pixels.length; i += 4) {
      const alpha = pixels[i + 3]
      // Skip fully transparent pixels (alpha === 0). We intentionally
      // do not exclude semi-transparent pixels here so they can contribute
      // to the color analysis if present.
      if (alpha === 0) continue // Skip fully transparent pixels

      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]

      totalPixelCount++

      // Check if pixel is black
      const brightness = (r + g + b) / 3
      if (brightness < 50) {
        blackPixelCount++
      }

      // Count all colors
      const toHex = (n) => n.toString(16).padStart(2, '0')
      const colorHex = `#${toHex(r)}${toHex(g)}${toHex(b)}`
      colorMap.set(colorHex, (colorMap.get(colorHex) || 0) + 1)
    }

    if (totalPixelCount === 0 || colorMap.size === 0) {
      console.warn(`⚠️  No pixels found for ${fileName}`)
      return '#ffffff'
    }

    // Find the most frequent non-black color (ignoring black/dark outlines)
    let dominantColor = '#ffffff'
    let maxCount = 0

    for (const [color, count] of colorMap) {
      const hex = color.slice(1)
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const brightness = (r + g + b) / 3

      // Skip black/very dark colors (these are outlines)
      if (brightness < 50) continue

      if (count > maxCount) {
        maxCount = count
        dominantColor = color
      }
    }

    return dominantColor
  } catch (error) {
    console.warn(`⚠️  Could not extract color from ${imagePath}: ${error.message}`)
    return '#000000'
  }
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

  // Process all files and collect color extraction promises
  const colorPromises = []

  files.forEach((file, index) => {
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

    // Collect color extraction promise
    colorPromises.push(
      getDominantColor(fullPath, file).then((color) => ({
        keyName,
        varName,
        w,
        h,
        folder,
        color,
      })),
    )
  })

  // Wait for all colors to be extracted
  Promise.all(colorPromises)
    .then((results) => {
      results.forEach(({ keyName, varName, w, h, folder, color }) => {
        // Generate sprite entry with folder information and main color
        spriteEntries.push(
          `  ${keyName}: { src: ${varName}, w: ${w}, h: ${h}, folder: '${folder}', mainColor: '${color}' },`,
        )
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
    })
    .catch((error) => {
      console.error('❌ Error extracting sprite colors:', error)
      process.exit(1)
    })
}

try {
  generateSpritesFile()
} catch (error) {
  console.error('❌ Error generating sprites file:', error)
  process.exit(1)
}

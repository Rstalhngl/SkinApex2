import { readFile, writeFile, mkdir, unlink } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"
import sharp from "sharp"
import pngToIco from "png-to-ico"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const svgPath = path.join(root, "public", "icon.svg")
const appDir = path.join(root, "app")
const publicDir = path.join(root, "public")

const svg = await readFile(svgPath)

async function writePng(size, outPath) {
  await sharp(svg).resize(size, size).png().toFile(outPath)
}

await mkdir(appDir, { recursive: true })
await mkdir(publicDir, { recursive: true })

const favicon16 = path.join(publicDir, ".favicon-16.png")
const favicon32 = path.join(publicDir, ".favicon-32.png")

await writePng(16, favicon16)
await writePng(32, favicon32)
await writePng(48, path.join(publicDir, "icon-48.png"))
await writePng(192, path.join(publicDir, "icon-192.png"))
await writePng(512, path.join(publicDir, "icon-512.png"))
await writePng(180, path.join(appDir, "apple-icon.png"))
await writePng(180, path.join(publicDir, "apple-icon.png"))

const ico = await pngToIco([await readFile(favicon16), await readFile(favicon32)])
await writeFile(path.join(appDir, "favicon.ico"), ico)
await writeFile(path.join(publicDir, "favicon.ico"), ico)

await unlink(favicon16)
await unlink(favicon32)

console.log("Generated favicon.ico, apple-icon.png, icon-48/192/512.png")

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import wabtFactory from 'wabt'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourcePath = resolve(root, 'wasm/dot_i8.wat')
const outputPath = resolve(root, 'public/wasm/pinhole-index.wasm')
const source = await readFile(sourcePath, 'utf8')
const wabt = await wabtFactory()
const module = wabt.parseWat(sourcePath, source, { simd: true })
module.resolveNames()
module.validate({ simd: true })
const { buffer } = module.toBinary({ canonicalize_lebs: true, write_debug_names: true })
await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, buffer)
console.log(`built ${outputPath} (${buffer.byteLength} bytes)`)

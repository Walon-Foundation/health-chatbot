import fs from "fs"
import mammoth from "mammoth"

export async function extractTextFromDocx(filepath: string):Promise<string>{
    const buffer = fs.readFileSync(filepath)
    const result =await mammoth.extractRawText({ buffer})

    return result.value.trim()
}
import * as fs from 'fs'
import path from 'path'
import * as dotenv from 'dotenv'
import axios from 'axios'
import Jimp from 'jimp'
import { Telegraf } from 'telegraf'
import { Dir, ImagesType, COLOR_FRAME } from './const'
import { nanoid } from 'nanoid'

dotenv.config()
const { BOT_TOKEN } = process.env

if (!BOT_TOKEN) {
  throw new Error(`BOT_TOKEN environment variable is not defined`)
}

const bot = new Telegraf(BOT_TOKEN)

bot.start(ctx => ctx.reply("Welcome. I'm not a bot!"))
bot.hears('hi', ctx => ctx.reply('Hey there'))
bot.on('photo', ctx => ctx.reply('Please send me a photo as a document'))
bot.on('document', async ctx => {
  const {
    file_id: fileId,
    mime_type: mimeType,
    file_name: fileName,
  } = ctx.message.document

  if (mimeType === ImagesType.JPEG) {
    const fileUrl = await ctx.telegram.getFileLink(fileId)
    console.log(fileUrl)

    // if ([fileId, mimeType, fileName].every(it => typeof it === 'string')) {}

    if (typeof fileName === 'string') {
      const [text, fileExt] = fileName.split('.')

      const dirPath = path.resolve(__dirname, `../${Dir.TEMP}/${nanoid(8)}`)
      fs.mkdirSync(dirPath)

      const imageSourcePath = `${dirPath}/source.${fileExt}`
      const imageOutputPath = `${dirPath}/output.${fileExt}`

      await downloadImage(fileUrl.href, imageSourcePath)
      await editImage(imageSourcePath, imageOutputPath, text)

      ctx.replyWithDocument({
        source: imageOutputPath,
        filename: fileName,
      })
    }

    ctx.reply(`Your file name: ${fileName}`)
  } else {
    ctx.reply('Please send me a photo (JPEG, JPG, PNG) as a document')
  }
})
bot.launch()

async function downloadImage(url: string, filePath: string) {
  const writer = fs.createWriteStream(filePath)

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

async function editImage(
  imagePathInput: string,
  imagePathOutput: string,
  text: string,
) {
  try {
    const image = await Jimp.read(imagePathInput)

    const indentImage = image.bitmap.width * 0.05
    const widthCanvas = image.bitmap.width + indentImage * 2
    const heightCanvas = image.bitmap.height + indentImage * 4

    const indentLeftText = indentImage * 2
    const indentTopText = image.bitmap.height + indentImage
    const widthText = image.bitmap.width - indentImage * 2
    const heightText = indentImage * 3

    const canvas = new Jimp(widthCanvas, heightCanvas, COLOR_FRAME)
    const font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK)

    canvas.composite(image, indentImage, indentImage)
    canvas.print(
      font,
      indentLeftText,
      indentTopText,
      {
        text,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
      },
      widthText,
      heightText,
    )
    await canvas.writeAsync(imagePathOutput)

    console.info('Image generated successfully')
  } catch (error) {
    console.info('Error editing image', error)
  }
}

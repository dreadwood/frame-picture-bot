import * as fs from 'fs'
import path from 'path'
import * as dotenv from 'dotenv'
import axios from 'axios'
// import Jimp from 'jimp';
import { Telegraf } from 'telegraf'
import { Dir, ImagesType } from './const'
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
  console.log(ctx.message.document)

  const {
    file_id: fileId,
    mime_type: mimeType,
    file_name: fileName,
  } = ctx.update.message.document

  if (mimeType === ImagesType.JPEG) {
    const fileUrl = await ctx.telegram.getFileLink(fileId)
    console.log(fileUrl)

    // if ([fileId, mimeType, fileName].every(it => typeof it === 'string')) {}

    if (typeof fileName === 'string') {
      /* FIXME */
      const filePath = path.resolve(__dirname, '..', Dir.TEMP, nanoid(8))
      fs.mkdirSync(filePath)

      downloadImage(fileUrl.href, `${filePath}/${fileName}`)
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

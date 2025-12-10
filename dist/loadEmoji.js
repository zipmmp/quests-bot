const fs = require("fs");
const path = require("path");
const { findProjectRoot } = require("./tools.js");
const axios = require("axios");
const sharp = require("sharp");
const ffmpeg = require("fluent-ffmpeg");
const { CustomClient } = require("../core/customClient.js");
const { Logger } = require("../core/logger.js");

const extractFirstFrameCached = new Map();

async function loadEmojis(client) {
  const emojiPath = path.join(findProjectRoot(), "emojis");
  const readDir = fs.readdirSync(emojiPath);
  const emojis = await client.application.emojis.fetch().catch(() => null);

  const unavailableEmojis = readDir.filter(
    (emoji) => !emojis.find((e) => e.name === emoji.split(".")[0])
  );

  for (const emoji of unavailableEmojis) {
    client.application.emojis
      .create({
        attachment: path.join("./emojis", emoji),
        name: emoji.split(".")[0],
      })
      .then((emoji) => {
        Logger.info(`Emoji ${emoji.name} created`);
      })
      .catch((err) => {
        Logger.info(`Error creating emoji ${emoji}: ${err.message}`);
      });
  }
}

async function createEmojiFromUrl(
  client,
  emojiUrl,
  emojiName,
  roundImage = false,
  cropImage = false
) {
  try {
    let uniqueEmojiName = emojiName;
    let emojiCache = client.application.emojis.cache.find(
      (e) =>
        e.name.trim().toLowerCase() === uniqueEmojiName.trim().toLowerCase()
    );

    if (emojiCache) {
      const timestamp = Date.now();
      uniqueEmojiName = `${emojiName}_${timestamp}`;
      emojiCache = client.application.emojis.cache.find(
        (e) =>
          e.name.trim().toLowerCase() === uniqueEmojiName.trim().toLowerCase()
      );
    }

    if (emojiCache) return emojiCache.toString();

    let response = await axios.get(emojiUrl, { responseType: "arraybuffer" });

    const isMp4 =
      emojiUrl.endsWith(".mp4") ||
      response.headers["content-type"]?.includes("video/mp4");

    let buffer;

    if (isMp4) {
      buffer = await extractFirstFrame(
        response.data,
        128,
        emojiName,
        roundImage,
        cropImage
      );
    } else {
      const size = 128;
      let image = sharp(response.data).resize(size, size);

      if (cropImage) {
        const metadata = await sharp(response.data).metadata();

        const baseSize = 512;
        const scaleX = metadata.width / baseSize;
        const scaleY = metadata.height / baseSize;

        const baseExtract = { left: 68, top: 66, width: 390, height: 390 };

        const extractRegion = {
          left: Math.round(baseExtract.left * scaleX),
          top: Math.round(baseExtract.top * scaleY),
          width: Math.round(baseExtract.width * scaleX),
          height: Math.round(baseExtract.height * scaleY),
        };

        image = image.extract(extractRegion);
      }

      if (roundImage) {
        const circleMask = Buffer.from(
          `<svg width="${size}" height="${size}">
             <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
           </svg>`
        );

        image = image.composite([{ input: circleMask, blend: "dest-in" }]);
      }

      buffer = await image.toFormat("png").toBuffer();
    }

    const createdEmoji = await client.application.emojis.create({
      attachment: buffer,
      name: uniqueEmojiName,
    });

    return createdEmoji.toString();
  } catch (error) {
    console.error(`Error creating emoji ${emojiName}: ${error.message}`);
    return null;
  }
}

function cleanupTempFiles(...files) {
  for (const file of files) {
    if (file && fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
}

async function _extractFirstFrame(
  videoBuffer,
  size = 128,
  name,
  roundImage = false,
  cropImage = false
) {
  return new Promise((resolve, reject) => {
    const projectRoot = findProjectRoot();
    const tempDir = path.join(projectRoot, "images");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const tempVideoPath = path.join(tempDir, `${name}.mp4`);
    const tempImagePath = path.join(tempDir, `${name}.png`);

    fs.writeFileSync(tempVideoPath, videoBuffer);

    ffmpeg(tempVideoPath)
      .on("end", async () => {
        try {
          let image = sharp(fs.readFileSync(tempImagePath));
          const metadata = await image.metadata();

          if (cropImage) {
            const baseSize = 512;
            const scaleX = metadata.width / baseSize;
            const scaleY = metadata.height / baseSize;

            const baseExtract = { left: 68, top: 66, width: 390, height: 390 };

            const extractRegion = {
              left: Math.round(baseExtract.left * scaleX),
              top: Math.round(baseExtract.top * scaleY),
              width: Math.round(baseExtract.width * scaleX),
              height: Math.round(baseExtract.height * scaleY),
            };

            image = image.extract(extractRegion);
          }

          image = image.resize(size, size);

          if (roundImage) {
            let circleMask = await sharp({
              create: {
                width: size,
                height: size,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 },
              },
            })
              .composite([
                {
                  input: Buffer.from(
                    `<svg width="${size}" height="${size}">
                       <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
                     </svg>`
                  ),
                  blend: "over",
                },
              ])
              .png()
              .toBuffer();

            circleMask = await sharp(circleMask).resize(size, size).toBuffer();
            image = image.composite([{ input: circleMask, blend: "dest-in" }]);
          }

          const processedBuffer = await image.png().toBuffer();
          cleanupTempFiles(tempVideoPath, tempImagePath);
          resolve(processedBuffer);
        } catch (err) {
          cleanupTempFiles(tempVideoPath, tempImagePath);
          reject(err);
        }
      })
      .on("error", (err) => {
        cleanupTempFiles(tempVideoPath, tempImagePath);
        reject(err);
      })
      .screenshots({
        count: 1,
        folder: tempDir,
        filename: path.basename(tempImagePath),
        size: `${size}x${size}`,
      });
  });
}

async function extractFirstFrame(
  videoBuffer,
  size = 128,
  name,
  roundImage = false,
  cropImage = false
) {
  if (extractFirstFrameCached.has(name)) {
    return extractFirstFrameCached.get(name);
  }

  const extractionPromise = _extractFirstFrame(
    videoBuffer,
    size,
    name,
    roundImage,
    cropImage
  );

  extractFirstFrameCached.set(name, extractionPromise);

  const result = await extractionPromise;
  extractFirstFrameCached.delete(name);
  return result;
}

module.exports = {
  loadEmojis,
  createEmojiFromUrl,
  extractFirstFrame,
  _extractFirstFrame,
};

const express = require("express")
const multer = require("multer")
const ffmpeg = require("fluent-ffmpeg")
const fs = require("fs")
const path = require("path")

const app = express()

const upload = multer({
  dest: "uploads/"
})

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads")
if (!fs.existsSync("outputs")) fs.mkdirSync("outputs")

app.post("/hdvideo", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "Video tidak ada"
      })
    }

    const input = req.file.path
    const output = `outputs/hd_${Date.now()}.mp4`

    ffmpeg(input)
.outputOptions([
  '-vf scale=-2:1440',
  '-c:v libx264',
  '-preset ultrafast',
  '-crf 23',
  '-c:a aac',
  '-b:a 128k'
])
      .save(output)
      .on("end", () => {
        const url =
          req.protocol +
          "://" +
          req.get("host") +
          "/" +
          output.replace(/\\/g, "/")

        fs.unlinkSync(input)

        res.json({
          status: true,
          result: url
        })
      })
      .on("error", err => {
        console.log(err)

        if (fs.existsSync(input))
          fs.unlinkSync(input)

        res.status(500).json({
          status: false,
          error: err.message
        })
      })
  } catch (e) {
    res.status(500).json({
      status: false,
      error: e.message
    })
  }
})

app.use("/outputs", express.static(path.join(__dirname, "outputs")))

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log("Server jalan di port", PORT)
})
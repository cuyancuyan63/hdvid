const express = require("express")
const multer = require("multer")
const ffmpeg = require("fluent-ffmpeg")
const fs = require("fs")
const path = require("path")

const app = express()

if (!fs.existsSync("uploads"))
    fs.mkdirSync("uploads", { recursive: true })

if (!fs.existsSync("outputs"))
    fs.mkdirSync("outputs", { recursive: true })

const upload = multer({
    dest: "uploads/",
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    }
})

app.get("/", (req, res) => {
    res.json({
        status: true,
        message: "HD Video API Online",
        qualities: ["1k", "2k", "4k"]
    })
})

app.post("/hdvideo", upload.single("video"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: false,
                message: "Video tidak ada"
            })
        }

        const quality = (req.query.quality || "1k").toLowerCase()

        let scale = "-2:1080"

        switch (quality) {
            case "1k":
                scale = "-2:1080"
                break

            case "2k":
                scale = "-2:1440"
                break

            case "4k":
                scale = "-2:2160"
                break

            default:
                scale = "-2:1080"
        }

        const input = req.file.path
        const output = `outputs/hd_${Date.now()}.mp4`

        ffmpeg(input)
            .outputOptions([
                `-vf scale=${scale}`,
                "-c:v libx264",
                "-preset ultrafast",
                "-crf 23",
                "-movflags +faststart",
                "-pix_fmt yuv420p",
                "-c:a aac",
                "-b:a 128k"
            ])
            .save(output)
            .on("end", () => {

                const url =
                    req.protocol +
                    "://" +
                    req.get("host") +
                    "/" +
                    output.replace(/\\/g, "/")

                if (fs.existsSync(input))
                    fs.unlinkSync(input)

                setTimeout(() => {
                    if (fs.existsSync(output)) {
                        try {
                            fs.unlinkSync(output)
                        } catch {}
                    }
                }, 300000) // 5 menit

                res.json({
                    status: true,
                    quality,
                    result: url
                })
            })
            .on("error", err => {
                console.log(err)

                if (fs.existsSync(input))
                    fs.unlinkSync(input)

                if (fs.existsSync(output))
                    fs.unlinkSync(output)

                res.status(500).json({
                    status: false,
                    error: err.message
                })
            })

    } catch (e) {
        console.log(e)

        res.status(500).json({
            status: false,
            error: e.message
        })
    }
})

app.use(
    "/outputs",
    express.static(path.join(__dirname, "outputs"))
)

const PORT = process.env.PORT || 3000

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server jalan di port ${PORT}`)
})

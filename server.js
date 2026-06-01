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
        fileSize: 200 * 1024 * 1024
    }
})

app.get("/", (req, res) => {
    res.json({
        status: true,
        message: "HD Video API Online",
        qualities: ["1k", "2k"]
    })
})

app.post("/hdvideo", upload.single("video"), async (req, res) => {
    try {

        if (!req.file) {
            return res.status(400).json({
                status: false,
                error: "Video tidak ditemukan"
            })
        }

        const quality =
            (req.query.quality || "1k")
            .toLowerCase()

        let scale = "-2:1080"

        switch (quality) {

            case "1k":
                scale = "-2:1080"
                break

            case "2k":
                scale = "-2:1280"
                break

            default:
                scale = "-2:1080"
        }

        const input = req.file.path
        const output =
            `outputs/hd_${Date.now()}.mp4`

        ffmpeg(input)
            .outputOptions([
                `-vf scale=${scale}:flags=lanczos,eq=contrast=1.05:saturation=1.08,unsharp=5:5:1.0:5:5:0.0`,
                "-c:v libx264",
                "-preset veryfast",
                "-crf 24",
                "-threads 1",
                "-pix_fmt yuv420p",
                "-movflags +faststart",
                "-c:a aac",
                "-b:a 128k"
            ])

            .save(output)

            .on("end", () => {

                try {
                    if (fs.existsSync(input))
                        fs.unlinkSync(input)
                } catch {}

                const url =
                    req.protocol +
                    "://" +
                    req.get("host") +
                    "/" +
                    output.replace(/\\/g, "/")

                setTimeout(() => {
                    try {
                        if (fs.existsSync(output))
                            fs.unlinkSync(output)
                    } catch {}
                }, 300000)

                res.json({
                    status: true,
                    quality,
                    result: url
                })

            })

            .on("error", err => {

                console.error(err)

                try {
                    if (fs.existsSync(input))
                        fs.unlinkSync(input)
                } catch {}

                try {
                    if (fs.existsSync(output))
                        fs.unlinkSync(output)
                } catch {}

                res.status(500).json({
                    status: false,
                    error: err.message
                })

            })

    } catch (e) {

        console.error(e)

        res.status(500).json({
            status: false,
            error: e.message
        })

    }
})

app.use(
    "/outputs",
    express.static(
        path.join(__dirname, "outputs")
    )
)

const PORT =
    process.env.PORT || 3000

app.listen(PORT, "0.0.0.0", () => {
    console.log(
        `🚀 Server jalan di port ${PORT}`
    )
})

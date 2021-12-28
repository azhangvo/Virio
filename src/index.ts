import express from 'express';
import busboy from "connect-busboy";
import bodyParser from "body-parser";
import * as fs from "fs";

const app = express()
const port = 5001;

app.use(busboy());
app.use(bodyParser.json())

enum DataType {
    text,
    image
}

let type: DataType = DataType.text;

let text = "";

let fileLock = false;
let fileData = {
    filename: "",
    mimeType: "",
};

function findEnding(mimetype: string) {
    switch(mimetype) {
        case "image/png":
            return "png";
        case "image/jpeg":
            return "jpg";
        case "image/heic":
            return "heic";
        default:
            console.log(`Unknown type ${type}`);
            return "bin"
    }
}

app.post("/", (req, res) => {
    if (req.busboy) {
        req.busboy.on("file", (fieldName, fileStream, data: { filename: string, encoding: string, mimeType: string }) => {
            if (fileLock) {
                res.status(503).send(new Error("Resource in use"));
                return;
            }

            fileData = data
            type = DataType.image

            const ending = findEnding(fileData.mimeType)

            fileLock = true;
            const file = fs.createWriteStream(`./data.${ending}`)
            fileStream.pipe(file)
            fileLock = false;

            res.send({success: true})
        });
        return req.pipe(req.busboy);
    } else {
        if (req.body.content) {
            text = req.body.content;
            type = DataType.text;
            res.send({success: true})
            return;
        }
        res.send({success: false})
    }
})

app.get("/", (req, res) => {
    if (type === DataType.text) {
        res.send({type: "text", content: text})
    } else {
        res.setHeader('Content-disposition', 'attachment; filename=' + fileData.filename);
        res.setHeader('Content-type', fileData.mimeType);

        const ending = findEnding(fileData.mimeType)
        const file = fs.createReadStream(`data.${ending}`)

        file.pipe(res)
    }
})

app.listen(port, () => {
    console.log(`App listening on port ${port}`)
})
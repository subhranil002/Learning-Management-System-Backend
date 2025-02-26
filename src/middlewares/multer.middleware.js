import path from "path";
import multer from "multer";

const upload = multer({
    dest: "./public/temp",
    limits: { fileSize: 500 * 1024 * 1024 },
    storage: multer.diskStorage({
        destination: "./public/temp",
        filename: (_req, file, cb) => {
            cb(null, file.originalname);
        }
    }),
    fileFilter: (_req, file, cb) => {
        let ext = path.extname(file.originalname);

        if (
            ext !== ".jpg" &&
            ext !== ".jpeg" &&
            ext !== ".webp" &&
            ext !== ".png" &&
            ext !== ".mp4"
        ) {
            cb(new Error(`Unsupported file type! ${ext}`), false);
            return;
        }

        cb(null, true);
    }
});

export default upload;

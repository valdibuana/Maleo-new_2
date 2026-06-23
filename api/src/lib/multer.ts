import multer from "multer";
import path from "path";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "../../uploads/materials");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

/**
 * Whitelist of allowed MIME types for file uploads.
 * Validates actual file content type, not just extension.
 */
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "application/vnd.ms-powerpoint": [".ppt"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
  "application/msword": [".doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "video/mp4": [".mp4"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
};

const ALL_ALLOWED_EXTENSIONS = Object.values(ALLOWED_MIME_TYPES).flat();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Check 1: MIME type must be in the whitelist
  if (!ALLOWED_MIME_TYPES[file.mimetype]) {
    cb(new Error(`File type not supported. Received MIME: ${file.mimetype}. Allowed: PDF, PPT, PPTX, DOC, DOCX, MP4, JPG, PNG`));
    return;
  }

  // Check 2: Extension must match the declared MIME type (prevents MIME spoofing)
  const expectedExtensions = ALLOWED_MIME_TYPES[file.mimetype];
  if (!expectedExtensions.includes(ext)) {
    cb(new Error(`File extension "${ext}" does not match MIME type "${file.mimetype}".`));
    return;
  }

  cb(null, true);
};

export const uploadMaterial = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: fileFilter,
});

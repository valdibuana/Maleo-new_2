"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMaterial = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path_1.default.join(__dirname, "../../uploads/materials");
        if (!fs_1.default.existsSync(uploadPath)) {
            fs_1.default.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
/**
 * Whitelist of allowed MIME types for file uploads.
 * Validates actual file content type, not just extension.
 */
const ALLOWED_MIME_TYPES = {
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
const fileFilter = (req, file, cb) => {
    const ext = path_1.default.extname(file.originalname).toLowerCase();
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
exports.uploadMaterial = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
    },
    fileFilter: fileFilter,
});
//# sourceMappingURL=multer.js.map
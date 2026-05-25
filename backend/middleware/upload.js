import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isPDF   = file.mimetype === 'application/pdf';
    const isVideo = file.mimetype.startsWith('video/');

    return {
      folder: 'lms',
      resource_type: isPDF ? 'raw' : isVideo ? 'video' : 'image',
      // For PDFs: keep original filename so URL ends in .pdf
      public_id: isPDF
        ? `pdf_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`
        : undefined,
    };
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

export default cloudinary;

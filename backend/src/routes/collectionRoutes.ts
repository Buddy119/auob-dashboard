import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  uploadCollection,
  getCollections,
  getCollection,
  runCollection,
  deleteCollection,
} from '../controllers/collectionController';

// Create collections directory if it doesn't exist
const collectionsDir = path.join(process.cwd(), 'collections');
if (!fs.existsSync(collectionsDir)) {
  fs.mkdirSync(collectionsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, collectionsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `collection-${uniqueSuffix}${ext}`);
  }
});

// File filter to only allow JSON files
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
    cb(null, true);
  } else {
    cb(new Error('Only JSON files are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const router = Router();

// Collection routes - EXACT paths to match frontend
router.post('/api/collections/upload', upload.single('collection'), uploadCollection);
router.get('/api/collections', getCollections);
router.get('/api/collections/:collectionId', getCollection);
router.post('/api/collections/:collectionId/run', runCollection);
router.delete('/api/collections/:collectionId', deleteCollection);

export default router;
import { Router,  } from 'express';
import { getReports, processImage, getReportsThisWeek, getTotalReportsThisWeek, getAllReports } from '../controllers/reportControllers';
import multer from 'multer';
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    },
  });

const router = Router();
router.get('/' , getAllReports);
router.post('/image-upload', upload.single('image'), processImage);
router.get('/this-week', getReportsThisWeek);
router.get('/total-this-week', getTotalReportsThisWeek);

export default router;
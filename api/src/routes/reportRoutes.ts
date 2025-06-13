import { Router,  } from 'express';
import { getReports, processImage, getReportsThisWeek, getTotalReportsThisWeek } from '../controllers/reportControllers';


const router = Router();
router.get('/', getReports);
router.post('/image-upload', processImage);
router.get('/this-week', getReportsThisWeek);
router.get('/total-this-week', getTotalReportsThisWeek);

export default router;
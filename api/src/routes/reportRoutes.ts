
import { Router } from 'express';
import { processImage, getReportsThisWeek, getValidReports, getMostReportedCategory, getReportById, getLatestReports, getMyReport } from '../controllers/reportControllers';
import { upload } from '../utils/uploadImageMulter';

const router = Router();
router.get('/', getValidReports); // ok
router.post('/create', upload.single('image'), processImage); //ok
router.get('/week', getReportsThisWeek); //ok
router.get('/most/category', getMostReportedCategory); //ok
router.get('/latest', getLatestReports); //ok
router.get('/:id', getReportById); //ok
router.post('/my-report', upload.none(), getMyReport); //ok
export default router;
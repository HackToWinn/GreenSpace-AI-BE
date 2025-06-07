import { Router } from 'express';
import { getUser } from '../controllers/userControllers';
import { getReports } from '../controllers/reportControllers';

const router = Router();

router.get('/', getReports);

export default router;
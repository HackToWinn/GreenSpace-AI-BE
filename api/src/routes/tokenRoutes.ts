import { Router } from 'express';
import { addUser, getUser, getUsers, updateUser } from '../controllers/userControllers';
import { upload } from '../utils/uploadImageMulter';
import { getBalance } from '../controllers/tokenControllers';

const router = Router();

router.post('/balance', upload.none(), getBalance);

export default router;
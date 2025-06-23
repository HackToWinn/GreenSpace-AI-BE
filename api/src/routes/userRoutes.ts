import { Router } from 'express';
import{ addUser, getUser, getUsers, updateUser} from '../controllers/userControllers';
import { upload } from '../utils/uploadImageMulter';

const router = Router();

router.post('/create',upload.single('picture'), addUser );
router.post('/update',upload.single('picture'), updateUser );
router.post('/get',upload.none(), getUser );
router.post('/get/all', getUsers);




export default router;
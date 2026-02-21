import { Router } from 'express';
import { register, login, googleAuth, getMe } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../helpers';

const router = Router();

router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.post('/google', asyncHandler(googleAuth));
router.get('/me', authMiddleware, asyncHandler(getMe));

export default router;

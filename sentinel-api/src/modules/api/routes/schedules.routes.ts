import { Router } from 'express';
import { listSchedules, createSchedule, updateSchedule, deleteSchedule } from '../controllers/schedules.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../helpers';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

router.get('/', asyncHandler(listSchedules));
router.post('/', asyncHandler(createSchedule));
router.put('/:id', asyncHandler(updateSchedule));
router.delete('/:id', asyncHandler(deleteSchedule));

export default router;

import { Router } from 'express';
import { listSkills, createSkill, updateSkill, deleteSkill } from '../controllers/skills.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../helpers';

const router = Router();
router.use(authMiddleware);

router.get('/', asyncHandler(listSkills));
router.post('/', asyncHandler(createSkill));
router.put('/:id', asyncHandler(updateSkill));
router.delete('/:id', asyncHandler(deleteSkill));

export default router;

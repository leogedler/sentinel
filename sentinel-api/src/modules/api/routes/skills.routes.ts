import { listSkills, createSkill, updateSkill, deleteSkill } from '../controllers/skills.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createRouter } from '../helpers';

const router = createRouter();
router.use(authMiddleware);

router.get('/', listSkills);
router.post('/', createSkill);
router.put('/:id', updateSkill);
router.delete('/:id', deleteSkill);

export default router;

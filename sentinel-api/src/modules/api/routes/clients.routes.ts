import { listClients, createClient, getClient, updateClient, deleteClient } from '../controllers/clients.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createRouter } from '../helpers';

const router = createRouter();
router.use(authMiddleware);

router.get('/', listClients);
router.post('/', createClient);
router.get('/:id', getClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;

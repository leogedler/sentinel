import { Router } from 'express';
import { listClients, createClient, getClient, updateClient, deleteClient } from '../controllers/clients.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { asyncHandler } from '../helpers';

const router = Router();
router.use(authMiddleware);

router.get('/', asyncHandler(listClients));
router.post('/', asyncHandler(createClient));
router.get('/:id', asyncHandler(getClient));
router.put('/:id', asyncHandler(updateClient));
router.delete('/:id', asyncHandler(deleteClient));

export default router;

import { Router } from 'express';
import { saveConfig, getConfig, updateConfig, deleteConfig, listConfigs } from '../controllers/configController';

const router = Router();

// Configuration management routes
router.post('/configs/:name', saveConfig);
router.get('/configs/:name', getConfig);
router.put('/configs/:name', updateConfig);
router.delete('/configs/:name', deleteConfig);
router.get('/configs', listConfigs);

export default router;
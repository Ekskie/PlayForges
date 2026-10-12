import { Router, Request, Response } from 'express';
import { getActivityLogs } from '../services/auditLogger.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 50;
  const logs = await getActivityLogs(1, limit);
  res.json({
    logs,
    total: logs.length
  });
});

export default router;

import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { requireAuth } from '../middleware/auth.js';
import { getDemoStats, activateRealMode } from '../services/demoMode.js';

const router = Router();

// Get current user demo status and stats
router.get('/stats', requireAuth, async (req: any, res: any) => {
  try {
    const stats = await getDemoStats(req.uid);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching demo stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Switch to Real Mode
router.post('/activate-real', requireAuth, async (req: any, res: any) => {
  try {
    await activateRealMode(req.uid);
    res.json({ success: true, message: 'Real mode activated!' });
  } catch (error) {
    console.error('Error activating real mode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update tour completion
router.post('/tour-complete', requireAuth, async (req: any, res: any) => {
  try {
    await db.update(users)
      .set({ hasCompletedTour: true })
      .where(eq(users.firebaseUid, req.uid));
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating tour status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

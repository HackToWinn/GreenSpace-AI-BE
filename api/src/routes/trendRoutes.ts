import { Router } from 'express';
import {
  getDailyTrends,
  getWeeklyTrends,
  getMonthlyTrends,
  getTrendsByCategory,
  getCategoryByYear,
} from '../controllers/trendController';

const router = Router();
router.get('/report', (req, res) => {
  const { period } = req.query;
  if (period === 'daily') return getDailyTrends(req, res);
  if (period === 'weekly') return getWeeklyTrends(req, res);
  if (period === 'monthly') return getMonthlyTrends(req, res);
  return res.status(400).json({ error: 'Invalid period parameter' });
}); // Get trends by period query parameter
router.get('/statistics/:year', getCategoryByYear); // Get statistics by year
router.get('/trends/category/:category', getTrendsByCategory); // Get trends by category
export default router;

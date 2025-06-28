import { Request, Response } from 'express';
import { Actor } from '@dfinity/agent';
import { useBackend } from '../hooks/useActor';

export const getDailyTrends = async (req: Request, res: Response) => {
  try {
    const Actor = await useBackend();
    const trends = await Actor.getDailyTrends();
    res.status(200).json(trends);
  } catch (error) {
    console.error('Error getting daily trends:', error);
    res.status(500).json({ error: 'Failed to fetch daily trends' });
  }
};

export const getWeeklyTrends = async (req: Request, res: Response) => {
  try {
    const actor = await useBackend();
    const trends = await actor.getWeeklyTrends();
    res.status(200).json(trends);
  } catch (error) {
    console.error('Error getting weekly trends:', error);
    res.status(500).json({ error: 'Failed to fetch weekly trends' });
  }
};

export const getMonthlyTrends = async (req: Request, res: Response) => {
  try {
    const actor = await useBackend();
    const trends = await actor.getMonthlyTrends();
    res.status(200).json(trends);
  } catch (error) {
    console.error('Error getting monthly trends:', error);
    res.status(500).json({ error: 'Failed to fetch monthly trends' });
  }
};

export const getTrendsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const actor = await useBackend();
    const trends = await actor.getTrendsByCategory(category);
    res.status(200).json(trends);
  } catch (error) {
    console.error('Error getting trends by category:', error);
    res.status(500).json({ error: 'Failed to fetch trends by category' });
  }
};

export const getCategoryByYear = async (req: Request, res: Response) => {
  try {
    const year = parseInt(req.params.year);
    const actor = await useBackend();
    const trends = await actor.getCategoryByYear(BigInt(year));
    res.status(200).json(trends);
  } catch (error) {
    console.error('Error getting category by year:', error);
    res.status(500).json({ error: 'Failed to fetch category by year' });
  }
};

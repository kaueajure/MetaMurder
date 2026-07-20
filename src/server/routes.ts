import { Router } from 'express';
import { getOrCreateGuest, getUserProfile, updateUserCustomization } from './db';
import { roomManager } from './roomManager';

export const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', game: 'MetaMurder' });
});

router.post('/auth/guest', async (req, res) => {
  try {
    const { guestId, name } = req.body;
    const id = guestId || `guest_${Math.random().toString(36).substr(2, 9)}`;
    const profile = await getOrCreateGuest(id, name || 'Tripulante');
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/profile/:id', async (req, res) => {
  try {
    const profile = await getUserProfile(req.params.id);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/profile/customize', async (req, res) => {
  try {
    const { userId, color, hatId, skinId } = req.body;
    await updateUserCustomization(userId, color, hatId, skinId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/rooms', (req, res) => {
  const rooms = roomManager.getPublicRooms();
  res.json({ success: true, rooms });
});

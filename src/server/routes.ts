import { Router } from 'express';
import { getOrCreateGuest, getUserProfile, updateUserCustomization, updateUsername } from './db';
import { roomManager } from './roomManager';
import { HATS, PLAYER_COLORS, SKINS } from '../shared/constants';

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
    const valid =
      typeof userId === 'string' &&
      PLAYER_COLORS.some(candidate => candidate.id === color) &&
      HATS.some(candidate => candidate.id === hatId) &&
      SKINS.some(candidate => candidate.id === skinId);
    if (!valid) {
      res.status(400).json({ error: 'Personalização inválida.' });
      return;
    }
    await updateUserCustomization(userId, color, hatId, skinId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/profile/name', async (req, res) => {
  const userId = typeof req.body.userId === 'string' ? req.body.userId : '';
  const username = typeof req.body.username === 'string'
    ? req.body.username.trim().replace(/\s+/g, ' ')
    : '';

  if (
    !userId ||
    username.length < 2 ||
    username.length > 15 ||
    !/^[\p{L}\p{N}_ -]+$/u.test(username)
  ) {
    res.status(400).json({
      error: 'Use de 2 a 15 caracteres: letras, números, espaço, hífen ou _.'
    });
    return;
  }

  try {
    await updateUsername(userId, username);
    const profile = await getUserProfile(userId);
    res.json({ success: true, profile });
  } catch (err: any) {
    if (err?.code === 'SQLITE_CONSTRAINT') {
      res.status(409).json({ error: 'Esse nome já está sendo usado.' });
      return;
    }
    res.status(500).json({ error: err?.message || 'Não foi possível alterar o nome.' });
  }
});

router.get('/rooms', (req, res) => {
  const rooms = roomManager.getPublicRooms();
  res.json({ success: true, rooms });
});

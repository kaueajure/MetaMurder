import sqlite3 from 'sqlite3';
import { UserProfile } from '../shared/types';
import path from 'path';
import fs from 'fs';

const rawDbPath = process.env.DATABASE_PATH || './db/database.sqlite';
const dbPath = path.isAbsolute(rawDbPath) ? rawDbPath : path.resolve(process.cwd(), rawDbPath);
const dbDir = path.dirname(dbPath);

try {
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create db directory, using tmp fallback:', e);
}

let db: sqlite3.Database;
try {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.warn('SQLite init warning, using memory fallback:', err);
      db = new sqlite3.Database(':memory:');
    }
  });
  db.on('error', (err) => {
    console.error('SQLite generic error:', err);
  });
} catch (err) {
  console.warn('SQLite sync init warning, using memory fallback:', err);
  db = new sqlite3.Database(':memory:');
}

export function initDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          is_guest INTEGER DEFAULT 1,
          equipped_color TEXT DEFAULT 'RED',
          equipped_hat TEXT DEFAULT 'NONE',
          equipped_skin TEXT DEFAULT 'DEFAULT',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS user_stats (
          user_id TEXT PRIMARY KEY,
          games_played INTEGER DEFAULT 0,
          crewmate_wins INTEGER DEFAULT 0,
          impostor_wins INTEGER DEFAULT 0,
          kills INTEGER DEFAULT 0,
          tasks_completed INTEGER DEFAULT 0,
          correct_votes INTEGER DEFAULT 0,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

export function getOrCreateGuest(guestId: string, name?: string): Promise<UserProfile> {
  return new Promise((resolve) => {
    const rawName = (name && name.trim()) ? name.trim().slice(0, 15) : '';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    // Always append random suffix for guests to guarantee uniqueness upfront
    const cleanName = rawName ? `${rawName}_${randomSuffix}` : `Tripulante_${randomSuffix}`;

    db.get('SELECT * FROM users WHERE id = ?', [guestId], (err, row: any) => {
      if (!err && row) {
        getUserProfile(guestId).then(resolve);
        return;
      }

      // Insert new guest with unique username
      db.run(
        'INSERT INTO users (id, username, is_guest) VALUES (?, ?, 1)',
        [guestId, cleanName],
        (err2) => {
          if (err2) {
            console.error('Guest insert failed:', err2);
            // Handle username constraint failure by retrying with random ID
            const fallbackUsername = `Tripulante_${guestId.slice(-4)}_${Math.floor(100 + Math.random() * 900)}`;
            db.run(
              'INSERT INTO users (id, username, is_guest) VALUES (?, ?, 1)',
              [guestId, fallbackUsername],
              (err3) => {
                if (err3) console.error('Fallback guest insert failed:', err3);
                db.run('INSERT INTO user_stats (user_id) VALUES (?)', [guestId], () => {});
                getUserProfile(guestId).then(resolve);
              }
            );
          } else {
            db.run('INSERT INTO user_stats (user_id) VALUES (?)', [guestId], () => {});
            getUserProfile(guestId).then(resolve);
          }
        }
      );
    });
  });
}

export function getUserProfile(userId: string): Promise<UserProfile> {
  return new Promise((resolve) => {
    const query = `
      SELECT u.id, u.username, u.is_guest, u.equipped_color, u.equipped_hat, u.equipped_skin,
             s.games_played, s.crewmate_wins, s.impostor_wins, s.kills, s.tasks_completed, s.correct_votes
      FROM users u
      LEFT JOIN user_stats s ON u.id = s.user_id
      WHERE u.id = ?
    `;

    db.get(query, [userId], (err, row: any) => {
      if (err || !row) {
        // Fallback default profile if not found
        resolve({
          id: userId,
          username: `Player_${userId.slice(0, 4)}`,
          isGuest: true,
          equippedColor: 'RED',
          equippedHat: 'NONE',
          equippedSkin: 'DEFAULT',
          stats: {
            gamesPlayed: 0,
            crewmateWins: 0,
            impostorWins: 0,
            kills: 0,
            tasksCompleted: 0,
            correctVotes: 0
          }
        });
        return;
      }

      resolve({
        id: row.id,
        username: row.username,
        isGuest: Boolean(row.is_guest),
        equippedColor: row.equipped_color || 'RED',
        equippedHat: row.equipped_hat || 'NONE',
        equippedSkin: row.equipped_skin || 'DEFAULT',
        stats: {
          gamesPlayed: row.games_played || 0,
          crewmateWins: row.crewmate_wins || 0,
          impostorWins: row.impostor_wins || 0,
          kills: row.kills || 0,
          tasksCompleted: row.tasks_completed || 0,
          correctVotes: row.correct_votes || 0
        }
      });
    });
  });
}

export function updateUserCustomization(userId: string, color: string, hatId: string, skinId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET equipped_color = ?, equipped_hat = ?, equipped_skin = ? WHERE id = ?',
      [color, hatId, skinId, userId],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function updateUsername(userId: string, username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET username = ? WHERE id = ?',
      [username, userId],
      function (err) {
        if (err) {
          reject(err);
        } else if (this.changes !== 1) {
          reject(new Error('Perfil não encontrado.'));
        } else {
          resolve();
        }
      }
    );
  });
}

export function recordGameStats(
  userId: string, 
  statsDelta: { crewWin?: boolean; impWin?: boolean; kills?: number; tasks?: number; correctVote?: boolean }
): Promise<void> {
  return new Promise((resolve) => {
    if (process.env.NODE_ENV === 'test') {
      resolve();
      return;
    }

    const cWin = statsDelta.crewWin ? 1 : 0;
    const iWin = statsDelta.impWin ? 1 : 0;
    const kills = statsDelta.kills || 0;
    const tasks = statsDelta.tasks || 0;
    const cVote = statsDelta.correctVote ? 1 : 0;

    const query = `
      UPDATE user_stats
      SET games_played = games_played + 1,
          crewmate_wins = crewmate_wins + ?,
          impostor_wins = impostor_wins + ?,
          kills = kills + ?,
          tasks_completed = tasks_completed + ?,
          correct_votes = correct_votes + ?
      WHERE user_id = ?
    `;

    db.run(query, [cWin, iWin, kills, tasks, cVote, userId], () => {
      resolve();
    });
  });
}

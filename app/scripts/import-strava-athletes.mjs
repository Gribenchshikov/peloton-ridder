/**
 * Разовый импорт атлетов из Google Sheets (лист Athletes) в онлайн-челлендж.
 *
 * Использование:
 *   node scripts/import-strava-athletes.mjs athletes.csv
 *
 * CSV должен иметь заголовки: Name,ATHLETE_ID,access_token,refresh_token,expires_at,City
 * Экспортируй лист Athletes из Google Sheets: File → Download → CSV
 */

import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const require = createRequire(import.meta.url);
const { Pool } = require('pg');

const EVENT_ID    = 'cms66wcxu0007hdrttpnpjxaa';
const DISTANCE_ID = 'cms66wcy20008hdrt706yco4v';
const EMAIL_DOMAIN = 'strava.ridder.kz'; // placeholder email

// ── env ────────────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,'')]; })
);

// ── CSV parse ──────────────────────────────────────────────────────────────
// Реальные колонки листа Athletes: Name, stravaid, <access_token>, <refresh_token>, <expires_at>, city
// Колонки 2-4 без заголовков — используем индексы
function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
  return lines.slice(1).map(line => {
    const vals = line.split(',');
    return {
      name:         (vals[0] ?? '').trim(),
      athleteId:    (vals[1] ?? '').trim().replace(/\.0$/, ''),
      accessToken:  (vals[2] ?? '').trim(),
      refreshToken: (vals[3] ?? '').trim(),
      expiresAt:    (vals[4] ?? '').trim(),
      city:         (vals[5] ?? '').trim() || null,
    };
  });
}

function splitName(full) {
  const parts = full.trim().split(' ');
  const firstName = parts[0] || 'Unknown';
  const lastName  = parts.slice(1).join(' ') || '-';
  return { firstName, lastName };
}

// ── main ───────────────────────────────────────────────────────────────────
const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/import-strava-athletes.mjs <athletes.csv>');
  process.exit(1);
}

const rows = parseCsv(readFileSync(resolve(csvPath), 'utf8'));
console.log(`Найдено строк в CSV: ${rows.length}`);

const pool = new Pool({ connectionString: env.DATABASE_URL });

let created = 0, skipped = 0, errors = 0;

for (const row of rows) {
  const { name, athleteId, accessToken, refreshToken, expiresAt: expiresRaw, city } = row;
  if (!athleteId) { skipped++; continue; }

  const { firstName, lastName } = splitName(name);
  const expiresAt = expiresRaw ? new Date(Number(expiresRaw) * 1000) : null;

  const email = `strava_${athleteId}@${EMAIL_DOMAIN}`;

  try {
    // 1. Создаём или находим User
    const existingUser = await pool.query(
      `SELECT id FROM "User" WHERE "stravaAthleteId" = $1 OR email = $2 LIMIT 1`,
      [athleteId, email]
    );

    let userId;
    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      // обновляем токены
      await pool.query(
        `UPDATE "User" SET "stravaAthleteId"=$1, "stravaAthleteName"=$2,
         "stravaAccessToken"=$3, "stravaRefreshToken"=$4, "stravaTokenExpiresAt"=$5,
         city = COALESCE(city, $6)
         WHERE id = $7`,
        [athleteId, name, accessToken, refreshToken, expiresAt, city, userId]
      );
    } else {
      const res = await pool.query(
        `INSERT INTO "User"
           (id, email, "emailVerified", "firstName", "lastName", city,
            "passwordHash", "stravaAthleteId", "stravaAthleteName",
            "stravaAccessToken", "stravaRefreshToken", "stravaTokenExpiresAt", "createdAt")
         VALUES
           (gen_random_uuid()::text, $1, now(), $2, $3, $4,
            '$2b$10$placeholder_hash_not_for_login_xxxxxxxxxxxxxxxxxxxxxxx',
            $5, $6, $7, $8, $9, now())
         RETURNING id`,
        [email, firstName, lastName, city, athleteId, name, accessToken, refreshToken, expiresAt]
      );
      userId = res.rows[0].id;
    }

    // 2. Создаём Registration (если нет)
    const existingReg = await pool.query(
      `SELECT id FROM "Registration" WHERE "userId"=$1 AND "eventId"=$2 LIMIT 1`,
      [userId, EVENT_ID]
    );

    if (existingReg.rows.length === 0) {
      await pool.query(
        `INSERT INTO "Registration"
           (id, "userId", "eventId", "distanceId", status, "createdAt")
         VALUES
           (gen_random_uuid()::text, $1, $2, $3, 'PAID', now())`,
        [userId, EVENT_ID, DISTANCE_ID]
      );
      console.log(`✅ ${name} (${athleteId}) — создан`);
      created++;
    } else {
      console.log(`⏭  ${name} (${athleteId}) — уже есть`);
      skipped++;
    }
  } catch (err) {
    console.error(`❌ ${name} (${athleteId}):`, err.message);
    errors++;
  }
}

await pool.end();
console.log(`\nГотово: создано ${created}, пропущено ${skipped}, ошибок ${errors}`);

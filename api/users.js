const { Client } = require('pg');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const connectionString = process.env.DATABASE_URL || process.env.STORAGE_POSTGRES_URL || process.env.CUSTOM_URL;
  if (!connectionString) {
    res.status(500).json({ success: false, message: 'No se encontró la URL de conexión a Neon.' });
    return;
  }

  const client = new Client({ connectionString });
  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
      )
    `);

    if (req.method === 'GET') {
      const result = await client.query('SELECT id, username, role FROM users ORDER BY id');
      res.status(200).json({ success: true, users: result.rows });
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let payload = {};
      try { payload = JSON.parse(body || '{}'); } catch { payload = {}; }

      if (req.method === 'POST') {
        const username = (payload.username || '').trim();
        const password = (payload.password || '').trim();
        const role = (payload.role || 'user').trim();
        if (!username || !password) {
          res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos.' });
          return;
        }
        await client.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [username, hashPassword(password), role]);
        res.status(200).json({ success: true, message: `Usuario agregado correctamente: ${username}` });
        return;
      }

      if (req.method === 'PUT') {
        const id = payload.id;
        const username = (payload.username || '').trim();
        const password = (payload.password || '').trim();
        const role = (payload.role || 'user').trim();
        if (!id || !username) {
          res.status(400).json({ success: false, message: 'Datos incompletos.' });
          return;
        }
        if (password) {
          await client.query('UPDATE users SET username = $1, password_hash = $2, role = $3 WHERE id = $4', [username, hashPassword(password), role, id]);
        } else {
          await client.query('UPDATE users SET username = $1, role = $2 WHERE id = $3', [username, role, id]);
        }
        res.status(200).json({ success: true, message: `Usuario actualizado correctamente: ${username}` });
        return;
      }

      if (req.method === 'DELETE') {
        const id = payload.id;
        if (!id) {
          res.status(400).json({ success: false, message: 'ID requerido.' });
          return;
        }
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: `Error de usuarios: ${error.message}` });
  } finally {
    await client.end().catch(() => {});
  }
};

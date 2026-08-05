const { Client } = require('pg');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function withTimeout(promise, ms, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then(value => { clearTimeout(timer); resolve(value); })
      .catch(error => { clearTimeout(timer); reject(error); });
  });
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

  let payload = {};
  if (req.method !== 'GET') {
    try {
      const rawBody = await readRequestBody(req);
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch (error) {
      res.status(400).json({ success: false, message: 'No se pudo leer el cuerpo de la solicitud.' });
      return;
    }
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await withTimeout(client.connect(), 5000, 'La conexión a Neon tardó demasiado.');
    await withTimeout(client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
      )
    `), 5000, 'La inicialización de la tabla tardó demasiado.');

    if (req.method === 'GET') {
      const result = await withTimeout(client.query('SELECT id, username, role FROM users ORDER BY id'), 5000, 'La consulta de usuarios tardó demasiado.');
      res.status(200).json({ success: true, users: result.rows });
      return;
    }

    if (req.method === 'POST') {
      const username = (payload.username || '').trim();
      const password = (payload.password || '').trim();
      const role = (payload.role || 'user').trim();
      if (!username || !password) {
        res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos.' });
        return;
      }
      await withTimeout(client.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [username, hashPassword(password), role]), 5000, 'La inserción tardó demasiado.');
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
        await withTimeout(client.query('UPDATE users SET username = $1, password_hash = $2, role = $3 WHERE id = $4', [username, hashPassword(password), role, id]), 5000, 'La actualización tardó demasiado.');
      } else {
        await withTimeout(client.query('UPDATE users SET username = $1, role = $2 WHERE id = $3', [username, role, id]), 5000, 'La actualización tardó demasiado.');
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
      await withTimeout(client.query('DELETE FROM users WHERE id = $1', [id]), 5000, 'La eliminación tardó demasiado.');
      res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
    }
  } catch (error) {
    const statusCode = error.message.includes('tardó demasiado') ? 504 : 500;
    res.status(statusCode).json({ success: false, message: `Error de usuarios: ${error.message}` });
  } finally {
    await client.end().catch(() => {});
  }
};

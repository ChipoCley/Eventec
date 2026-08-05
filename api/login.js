const { Client } = require('pg');

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  let body = '';
  try {
    body = await readRequestBody(req);
  } catch (error) {
    res.status(400).json({ success: false, message: 'No se pudo leer el cuerpo de la solicitud.' });
    return;
  }

  const params = new URLSearchParams(body);
  const username = params.get('username') || '';
  const password = params.get('password') || '';

  const connectionString = process.env.DATABASE_URL || process.env.STORAGE_POSTGRES_URL || process.env.CUSTOM_URL;

  if (!connectionString) {
    res.status(500).json({ success: false, message: 'No se encontró la URL de conexión a Neon.' });
    return;
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

    const existing = await withTimeout(client.query('SELECT username FROM users WHERE username = $1', ['admin']), 5000, 'La consulta de usuarios tardó demasiado.');
    if (existing.rowCount === 0) {
      await withTimeout(client.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        ['admin', require('crypto').createHash('sha256').update('admin123').digest('hex'), 'admin']
      ), 5000, 'La inserción tardó demasiado.');
    }

    const result = await withTimeout(client.query('SELECT username, password_hash, role FROM users WHERE username = $1', [username]), 5000, 'La consulta de usuarios tardó demasiado.');
    if (result.rowCount === 0) {
      res.status(401).json({ success: false, message: 'Usuario no encontrado' });
      return;
    }

    const row = result.rows[0];
    const submittedHash = require('crypto').createHash('sha256').update(password).digest('hex');
    if (submittedHash !== row.password_hash) {
      res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
      return;
    }

    res.status(200).json({ success: true, username: row.username, role: row.role });
  } catch (error) {
    const statusCode = error.message.includes('tardó demasiado') ? 504 : 500;
    res.status(statusCode).json({ success: false, message: `Login error: ${error.message}` });
  } finally {
    await client.end().catch(() => {});
  }
};

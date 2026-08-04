import hashlib
import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    connection_url = os.getenv("CUSTOM_URL") or os.getenv("DATABASE_URL")
    if not connection_url:
        raise RuntimeError("DATABASE_URL or CUSTOM_URL must be set to use PostgreSQL/Neon.")
    return psycopg2.connect(connection_url)


def init_db():
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user'
            )
            """
        )

        cur.execute("SELECT COUNT(*) FROM users")
        if cur.fetchone()[0] == 0:
            cur.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
                ("admin", hash_password("admin123"), "admin"),
            )

        conn.commit()
    finally:
        if hasattr(cur, "close"):
            cur.close()
        if hasattr(conn, "close"):
            conn.close()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def authenticate_user(username: str, password: str):
    init_db()
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT username, password_hash, role FROM users WHERE username = %s", (username,))
        row = cur.fetchone()
    finally:
        if hasattr(cur, "close"):
            cur.close()
        if hasattr(conn, "close"):
            conn.close()

    if not row:
        return {"success": False, "message": "Usuario no encontrado"}

    stored_hash = row[1]
    if hash_password(password) != stored_hash:
        return {"success": False, "message": "Contraseña incorrecta"}

    return {"success": True, "username": row[0], "role": row[2]}

import hashlib
import json
import os
import traceback
from http import HTTPStatus
from urllib.parse import parse_qs

import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_db_connection():
    connection_url = (
        os.getenv("DATABASE_URL")
        or os.getenv("CUSTOM_URL")
        or os.getenv("STORAGE_POSTGRES_URL")
        or os.getenv("STORAGE_POSTGRES_URL_NO_SSL")
        or os.getenv("POSTGRES_URL")
        or os.getenv("POSTGRES_PRISMA_URL")
    )

    if not connection_url:
        raise RuntimeError("No se encontró una URL de conexión válida para PostgreSQL/Neon. Define DATABASE_URL o STORAGE_POSTGRES_URL en Vercel.")

    return psycopg2.connect(connection_url)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


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
        cur.execute("SELECT username FROM users WHERE username = %s", ("admin",))
        if cur.fetchone() is None:
            cur.execute(
                "INSERT INTO users (username, password_hash, role) VALUES (%s, %s, %s)",
                ("admin", hash_password("admin123"), "admin"),
            )
        conn.commit()
    except Exception as exc:
        conn.rollback()
        raise RuntimeError(f"No se pudo inicializar la base de datos: {exc}") from exc
    finally:
        if hasattr(cur, "close"):
            cur.close()
        if hasattr(conn, "close"):
            conn.close()


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

    if hash_password(password) != row[1]:
        return {"success": False, "message": "Contraseña incorrecta"}

    return {"success": True, "username": row[0], "role": row[2]}


def handler(event, context=None):
    method = (event.get("httpMethod") or event.get("method") or "").upper()

    if method == "OPTIONS":
        return {
            "statusCode": HTTPStatus.OK,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": "",
        }

    if method != "POST":
        return {
            "statusCode": HTTPStatus.METHOD_NOT_ALLOWED,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps({"success": False, "message": "Method not allowed"}),
        }

    body = event.get("body", "") or ""
    if isinstance(body, str):
        data = parse_qs(body)
    else:
        data = body

    username = data.get("username", [""])[0].strip()
    password = data.get("password", [""])[0].strip()

    try:
        result = authenticate_user(username, password)
        status_code = HTTPStatus.OK if result.get("success") else HTTPStatus.UNAUTHORIZED
    except Exception as exc:
        result = {"success": False, "message": f"Login error: {exc}", "debug": traceback.format_exc()}
        status_code = HTTPStatus.INTERNAL_SERVER_ERROR

    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(result),
    }


app = handler

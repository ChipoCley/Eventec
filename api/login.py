import json
import os
from http import HTTPStatus
from urllib.parse import parse_qs

from auth_service import authenticate_user


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

    try:
        body = event.get("body", "") or ""
        if isinstance(body, str):
            data = parse_qs(body)
        else:
            data = body
        username = data.get("username", [""])[0].strip()
        password = data.get("password", [""])[0].strip()

        result = authenticate_user(username, password)
        return {
            "statusCode": HTTPStatus.OK,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            "body": json.dumps(result),
        }
    except Exception as exc:
        return {
            "statusCode": HTTPStatus.INTERNAL_SERVER_ERROR,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({"success": False, "message": str(exc)}),
        }

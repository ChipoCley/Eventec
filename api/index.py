import json
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

    body = event.get("body", "") or ""
    if isinstance(body, str):
        data = parse_qs(body)
    else:
        data = body

    username = data.get("username", [""])[0].strip()
    password = data.get("password", [""])[0].strip()
    result = authenticate_user(username, password)
    status_code = HTTPStatus.OK if result.get("success") else HTTPStatus.UNAUTHORIZED

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

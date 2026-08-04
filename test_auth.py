import json
import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(__file__))

import auth_service
from api import login


class FakeCursor:
    def __init__(self, row):
        self.row = row
        self.queries = []

    def execute(self, query, params=None):
        self.queries.append((query, params))

    def fetchone(self):
        if self.queries and self.queries[-1][0].startswith('SELECT COUNT'):
            return (0,)
        return self.row


class FakeConnection:
    def __init__(self, row):
        self.row = row
        self.closed = False

    def cursor(self):
        return FakeCursor(self.row)

    def commit(self):
        return None

    def close(self):
        self.closed = True


def test_get_db_connection_requires_custom_url(monkeypatch):
    monkeypatch.delenv('CUSTOM_URL', raising=False)
    monkeypatch.delenv('DATABASE_URL', raising=False)
    with pytest.raises(RuntimeError, match='DATABASE_URL|CUSTOM_URL'):
        auth_service.get_db_connection()


def test_get_db_connection_uses_database_url(monkeypatch):
    monkeypatch.delenv('CUSTOM_URL', raising=False)
    monkeypatch.setenv('DATABASE_URL', 'postgresql://user:pass@host:5432/db')

    class FakeConnectionFactory:
        def __init__(self):
            self.urls = []

        def __call__(self, url):
            self.urls.append(url)
            return FakeConnection(('admin', auth_service.hash_password('admin123'), 'admin'))

    factory = FakeConnectionFactory()
    monkeypatch.setattr(auth_service.psycopg2, 'connect', factory)

    assert auth_service.get_db_connection() is not None
    assert factory.urls == ['postgresql://user:pass@host:5432/db']


def test_login_handler_accepts_method_field(monkeypatch):
    monkeypatch.setattr(login, 'authenticate_user', lambda username, password: {'success': True, 'username': username, 'role': 'admin'})

    response = login.handler({'method': 'POST', 'body': 'username=admin&password=admin123'})

    assert response['statusCode'] == 200
    assert json.loads(response['body'])['success'] is True


def test_login_with_seeded_user(monkeypatch):
    monkeypatch.setenv('CUSTOM_URL', 'postgresql://user:pass@host:5432/db')
    monkeypatch.setattr(auth_service, 'get_db_connection', lambda: FakeConnection(('admin', auth_service.hash_password('admin123'), 'admin')))

    user = auth_service.authenticate_user('admin', 'admin123')
    assert user['success'] is True
    assert user['username'] == 'admin'


def test_login_with_wrong_password(monkeypatch):
    monkeypatch.setenv('CUSTOM_URL', 'postgresql://user:pass@host:5432/db')
    monkeypatch.setattr(auth_service, 'get_db_connection', lambda: FakeConnection(('admin', auth_service.hash_password('admin123'), 'admin')))

    user = auth_service.authenticate_user('admin', 'wrong-password')
    assert user['success'] is False

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

import server


def test_login_with_seeded_user():
    user = server.authenticate_user('admin', 'admin123')
    assert user['success'] is True
    assert user['username'] == 'admin'


def test_login_with_wrong_password():
    user = server.authenticate_user('admin', 'wrong-password')
    assert user['success'] is False

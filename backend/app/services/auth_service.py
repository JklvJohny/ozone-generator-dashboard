"""
Authentication service — verifies the access code and issues tokens.
"""
from app.core.config import settings
from app.core.security import create_access_token


def verify_code(code: str) -> tuple[bool, str | None]:
    """
    Compares the provided code against the configured ACCESS_CODE.
    Returns (True, token_string) on match, or (False, None) on mismatch.
    """
    if code == settings.ACCESS_CODE:
        token = create_access_token()
        return True, token
    return False, None

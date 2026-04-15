import os
import base64
from cryptography.fernet import Fernet # type: ignore
from cryptography.hazmat.primitives import hashes # type: ignore
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC # type: ignore

def derive_key(password: str):
    """
    .env에 설정된 ENCRYPTION_SEED를 솔트로 사용하여 사용자 비밀번호로부터 암호화 키를 파생합니다.
    """
    seed = os.getenv('ENCRYPTION_SEED', 'default_secret_seed_123').encode()
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=seed,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return key

def encrypt_content(content: str, password: str):
    """지정된 비밀번호로 내용을 암호화합니다."""
    key = derive_key(password)
    f = Fernet(key)
    encrypted_data = f.encrypt(content.encode()).decode()
    return encrypted_data

def decrypt_content(encrypted_data: str, password: str):
    """지정된 비밀번호로 암호화된 내용을 복호화합니다."""
    try:
        key = derive_key(password)
        f = Fernet(key)
        decrypted_data = f.decrypt(encrypted_data.encode()).decode()
        return decrypted_data
    except Exception:
        # 비밀번호가 틀리거나 데이터가 손상된 경우
        return None

def get_master_key():
    """파일 암호화에 사용될 시스템 마스터 키를 생성합니다."""
    seed = os.getenv('ENCRYPTION_SEED', 'master_default_seed_777')
    return derive_key(seed)

def encrypt_file(data: bytes):
    """데이터를 시스템 마스터 키로 암호화합니다."""
    key = get_master_key()
    f = Fernet(key)
    return f.encrypt(data)

def decrypt_file(data: bytes):
    """데이터를 시스템 마스터 키로 복호화합니다."""
    try:
        key = get_master_key()
        f = Fernet(key)
        return f.decrypt(data)
    except Exception:
        # 복호화 실패 (암호화되지 않은 파일이거나 키가 다름)
        return None

import os
import sqlite3
import base64
from cryptography.fernet import Fernet # type: ignore
from cryptography.hazmat.primitives import hashes # type: ignore
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC # type: ignore

# .env 로드 시도 (오프라인 툴이므로 없으면 직접 입력받음)
try:
    from dotenv import load_dotenv # type: ignore
    load_dotenv()
except ImportError:
    pass

def derive_key(password: str, seed: str):
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=seed.encode(),
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(password.encode()))

def decrypt_content(encrypted_data: str, password: str, seed: str):
    try:
        key = derive_key(password, seed)
        f = Fernet(key)
        return f.decrypt(encrypted_data.encode()).decode()
    except Exception:
        return None

def main():
    print("=" * 60)
    print(" 🛡️  뇌사료 오프라인 복호화 및 추출 도구 (Offline Exporter) ")
    print("=" * 60)
    
    # 1. DB 파일 경로 확인
    default_db = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data', 'memos.db'))
    db_path = input(f"SQLite DB 파일 경로를 입력하세요\n(엔터 시 기본값: {default_db}): ").strip()
    if not db_path:
        db_path = default_db
        
    if not os.path.exists(db_path):
        print(f"\n[오류] DB 파일을 찾을 수 없습니다: {db_path}")
        return
        
    # 2. ENCRYPTION_SEED 확인
    seed = os.getenv('ENCRYPTION_SEED')
    if not seed:
        print("\n[경고] .env 파일에서 ENCRYPTION_SEED를 찾을 수 없습니다.")
        seed_input = input("ENCRYPTION_SEED 값을 직접 입력하세요 (기본값 사용 시 엔터): ").strip()
        seed = seed_input if seed_input else 'default_secret_seed_123'
    else:
        print(f"[정보] 시스템에서 ENCRYPTION_SEED를 자동으로 로드했습니다.")
        
    # 3. 내보내기 폴더 설정
    default_export = os.path.abspath(os.path.join(os.path.dirname(__file__), 'export'))
    export_dir = input(f"\n마크다운을 저장할 폴더 경로를 입력하세요\n(엔터 시 기본값: {default_export}): ").strip()
    if not export_dir:
        export_dir = default_export
    os.makedirs(export_dir, exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT * FROM memos")
    memos = c.fetchall()
    
    print(f"\n[시작] 총 {len(memos)}개의 메모 데이터를 분석합니다...\n")
    
    success_count = 0
    fail_count = 0
    cached_passwords = set()
    
    for memo in memos:
        mid = memo['id']
        uuid_str = memo['uuid']
        title = memo['title'] or f"Untitled_{mid}"
        content = memo['content'] or ''
        is_encrypted = memo['is_encrypted']
        category = memo['category'] or ''
        group = memo['group_name'] or ''
        created_at = memo['created_at'] or ''
        
        # 태그 가져오기
        c.execute("SELECT name FROM tags WHERE memo_id = ?", (mid,))
        tags = [row['name'] for row in c.fetchall()]
        
        decrypted_content = content
        
        # 암호화된 메모 처리
        if is_encrypted:
            print(f"🔒 [잠김] 메모 ID {mid}: '{title}' (암호화됨)")
            
            # 캐시된 비밀번호(이전에 성공한 비밀번호) 먼저 찔러보기
            auto_decrypted = False
            for pwd in cached_passwords:
                res = decrypt_content(content, pwd, seed)
                if res is not None:
                    decrypted_content = res
                    auto_decrypted = True
                    print(f"  -> 🔑 (이전에 입력한 비밀번호로 자동 복호화 성공!)")
                    break
                    
            # 캐시된 비밀번호로 실패하면 사용자에게 직접 입력 받음
            if not auto_decrypted:
                while True:
                    pwd = input("  -> 🔑 복호화 비밀번호 입력 (건너뛰려면 엔터): ").strip()
                    if not pwd:
                        print("  -> ⏭️ (건너뜀)\n")
                        fail_count += 1
                        decrypted_content = None
                        break
                        
                    res = decrypt_content(content, pwd, seed)
                    if res is not None:
                        decrypted_content = res
                        cached_passwords.add(pwd) # 다음 메모를 위해 저장
                        print("  -> ✅ 복호화 성공!\n")
                        break
                    else:
                        print("  -> ❌ [실패] 비밀번호가 틀립니다. 다시 시도해주세요.")
                        
            if decrypted_content is None:
                continue # 건너뛴 메모이므로 저장하지 않음
                
        # 파일명 생성 및 치환
        safe_title = "".join([char for char in title if char.isalnum() or char in " _-"]).rstrip()
        if not safe_title:
            safe_title = "Untitled"
        
        # 중복 방지 (UUID 앞 8자리)
        md_filename = f"{safe_title}_{uuid_str[:8]}.md" if uuid_str else f"{safe_title}_{mid}.md"
        filepath = os.path.join(export_dir, md_filename)
        
        # YAML Frontmatter 생성
        frontmatter = f"---\n"
        if uuid_str: frontmatter += f"uuid: {uuid_str}\n"
        frontmatter += f"title: {title}\n"
        if category: frontmatter += f"category: {category}\n"
        if group: frontmatter += f"group: {group}\n"
        if created_at: frontmatter += f"date: {created_at}\n"
        if tags:
            tags_str = ", ".join(tags)
            frontmatter += f"tags: [{tags_str}]\n"
        frontmatter += f"---\n\n"
        
        full_text = frontmatter + decrypted_content
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(full_text)
            
        success_count += 1
        if not is_encrypted:
            print(f"📝 [평문] '{title}' -> 저장 완료")
            
    print("\n" + "=" * 60)
    print(f" 🎉 완료! 총 {len(memos)}개 중 {success_count}개 추출 성공 (실패/건너뜀: {fail_count}개)")
    print(f" 📂 저장 위치: {os.path.abspath(export_dir)}")
    print("=" * 60)
    
if __name__ == "__main__":
    main()

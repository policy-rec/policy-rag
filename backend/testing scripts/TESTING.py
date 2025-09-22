import hashlib
import secrets
import base64

def generate_password_hash(password, iterations=100000):
    """
    Generate a secure password hash using PBKDF2 with SHA-256
    
    Args:
        password (str): The plain text password to hash
        iterations (int): Number of iterations (default 100,000 for security)
    
    Returns:
        str: Base64 encoded hash in format: salt$iterations$hash
    """
    # Generate random salt (32 bytes = 256 bits)
    salt = secrets.token_bytes(32)
    
    # Create hash using PBKDF2 with SHA-256
    password_bytes = password.encode('utf-8')
    hash_bytes = hashlib.pbkdf2_hmac('sha256', password_bytes, salt, iterations)
    
    # Encode salt and hash as base64 for storage
    salt_b64 = base64.b64encode(salt).decode('ascii')
    hash_b64 = base64.b64encode(hash_bytes).decode('ascii')
    
    # Return in format: salt$iterations$hash
    return f"{salt_b64}${iterations}${hash_b64}"


def check_password_hash(stored_hash, password):
    """
    Verify a password against a stored hash
    
    Args:
        stored_hash (str): The stored hash from database
        password (str): The plain text password to verify
    
    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        # Split the stored hash into components
        parts = stored_hash.split('$')
        if len(parts) != 3:
            return False
        
        salt_b64, iterations_str, stored_hash_b64 = parts
        
        # Decode the salt and convert iterations to int
        salt = base64.b64decode(salt_b64)
        iterations = int(iterations_str)
        
        # Hash the provided password with the same salt and iterations
        password_bytes = password.encode('utf-8')
        new_hash_bytes = hashlib.pbkdf2_hmac('sha256', password_bytes, salt, iterations)
        new_hash_b64 = base64.b64encode(new_hash_bytes).decode('ascii')
        
        # Secure comparison to prevent timing attacks
        return secrets.compare_digest(stored_hash_b64, new_hash_b64)
        
    except (ValueError, TypeError):
        # Handle any decoding or conversion errors
        return False


# Example usage and testing
if __name__ == "__main__":
    print("=== PASSWORD HASHING DEMO ===\n")
    
    # Test password
    test_password = "mySecurePassword123!"
    
    # Generate hash
    print("1. GENERATING HASH:")
    password_hash = generate_password_hash(test_password)
    print(f"Original password: {test_password}")
    print(f"Generated hash: {password_hash}")
    print(f"Hash length: {len(password_hash)} characters")
    
    # Test correct password
    print("\n2. TESTING CORRECT PASSWORD:")
    is_valid = check_password_hash(password_hash, test_password)
    print(f"Password '{test_password}' is valid: {is_valid}")
    
    # Test wrong password
    print("\n3. TESTING WRONG PASSWORD:")
    wrong_password = "wrongPassword"
    is_valid = check_password_hash(password_hash, wrong_password)
    print(f"Password '{wrong_password}' is valid: {is_valid}")
    
    # Test same password creates different hashes (due to random salt)
    print("\n4. TESTING DIFFERENT SALTS:")
    hash1 = generate_password_hash(test_password)
    hash2 = generate_password_hash(test_password)
    print(f"Hash 1: {hash1}")
    print(f"Hash 2: {hash2}")
    print(f"Hashes are different: {hash1 != hash2}")
    print("^ This is good! Random salts prevent rainbow table attacks")
    
    # Both hashes should validate the same password
    print(f"Both hashes validate same password: {check_password_hash(hash1, test_password) and check_password_hash(hash2, test_password)}")
    
    # print("\n=== SECURITY FEATURES ===")
    # print("""
    # ✓ PBKDF2 with SHA-256 (industry standard)
    # ✓ 100,000 iterations (slow enough to prevent brute force)
    # ✓ 32-byte random salt (prevents rainbow table attacks)
    # ✓ Secure comparison (prevents timing attacks)
    # ✓ Error handling for malformed hashes
    # ✓ Same password creates different hashes each time
    # """)


# Alternative: Simpler version using scrypt (if you prefer)
# def generate_password_hash_scrypt(password):
#     """Alternative using scrypt algorithm"""
#     salt = secrets.token_bytes(32)
#     password_bytes = password.encode('utf-8')
    
#     # scrypt parameters: N=16384, r=8, p=1 (good defaults)
#     hash_bytes = hashlib.scrypt(password_bytes, salt=salt, n=16384, r=8, p=1)
    
#     salt_b64 = base64.b64encode(salt).decode('ascii')
#     hash_b64 = base64.b64encode(hash_bytes).decode('ascii')
    
#     return f"{salt_b64}$scrypt${hash_b64}"


# def check_password_hash_scrypt(stored_hash, password):
#     """Verify password for scrypt version"""
#     try:
#         parts = stored_hash.split('$')
#         if len(parts) != 3 or parts[1] != 'scrypt':
#             return False
        
#         salt_b64, algorithm, stored_hash_b64 = parts
#         salt = base64.b64decode(salt_b64)
        
#         password_bytes = password.encode('utf-8')
#         new_hash_bytes = hashlib.scrypt(password_bytes, salt=salt, n=16384, r=8, p=1)
#         new_hash_b64 = base64.b64encode(new_hash_bytes).decode('ascii')
        
#         return secrets.compare_digest(stored_hash_b64, new_hash_b64)
        
#     except (ValueError, TypeError):
#         return False


# print("\n=== USAGE IN YOUR USER CLASS ===")
# print("""
# # Simply replace the imports in your User class:
# # from werkzeug.security import generate_password_hash, check_password_hash

# # With your custom functions (no additional dependencies needed!):
# from your_password_utils import generate_password_hash, check_password_hash

# # The rest of your User class methods work exactly the same:
# def set_password(self, password):
#     self.password_hash = generate_password_hash(password)

# def check_password(self, password):
#     return check_password_hash(self.password_hash, password)
# """)
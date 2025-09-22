import subprocess
import os

REQUIREMENTS_FILE = "requirements.txt"

def install_dependencies(filename):
    if not os.path.exists(filename):
        print(f"Error: {filename} not found.")
        return
    print(f"Installing dependencies from {filename}...")
    subprocess.check_call(["pip", "install", "-r", filename])

def run_uvicorn():
    print("Starting FastAPI server using uvicorn...")
    subprocess.run(["uvicorn", "main:app", "--reload"])

if __name__ == "__main__":
    try:
        # install_dependencies(REQUIREMENTS_FILE)
        run_uvicorn()
    except Exception as e:
        print(f"Error: {e}")
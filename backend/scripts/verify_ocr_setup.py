#!/usr/bin/env python3
"""
OCR Module Setup Verification Script
Checks that all components are correctly installed and configured
"""

import sys
import os
from pathlib import Path
from typing import List, Tuple

# Colors for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def print_header(text: str):
    """Print section header"""
    print(f"\n{Colors.BLUE}{'=' * 60}")
    print(f"{text}")
    print(f"{'=' * 60}{Colors.RESET}\n")

def print_success(text: str):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {text}{Colors.RESET}")

def print_warning(text: str):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.RESET}")

def print_error(text: str):
    """Print error message"""
    print(f"{Colors.RED}✗ {text}{Colors.RESET}")

def check_file_exists(file_path: str) -> bool:
    """Check if file exists"""
    return Path(file_path).exists()

def check_module_files() -> Tuple[bool, List[str]]:
    """Check if all module files exist"""
    print_header("1. Checking Module Files")

    base_path = "modules/ocr"
    required_files = [
        "__init__.py",
        "models.py",
        "schemas.py",
        "repository.py",
        "processor.py",
        "engine.py",
        "tasks.py",
        "router.py",
        "README.md",
    ]

    missing_files = []
    for file in required_files:
        file_path = f"{base_path}/{file}"
        if check_file_exists(file_path):
            print_success(f"Found {file_path}")
        else:
            print_error(f"Missing {file_path}")
            missing_files.append(file_path)

    if not missing_files:
        print_success("All module files present")
        return True, []
    else:
        return False, missing_files

def check_migration() -> bool:
    """Check if migration file exists"""
    print_header("2. Checking Database Migration")

    migration_file = "alembic/versions/008_create_ocr_jobs_table.py"
    if check_file_exists(migration_file):
        print_success(f"Found migration: {migration_file}")
        return True
    else:
        print_error(f"Missing migration: {migration_file}")
        return False

def check_dependencies() -> Tuple[bool, List[str]]:
    """Check if required Python packages are installed"""
    print_header("3. Checking Python Dependencies")

    required_packages = [
        ("pytesseract", "pytesseract"),
        ("PIL", "Pillow"),
        ("cv2", "opencv-python"),
        ("numpy", "numpy"),
        ("dateutil", "python-dateutil"),
    ]

    missing_packages = []
    for import_name, package_name in required_packages:
        try:
            __import__(import_name)
            print_success(f"{package_name} installed")
        except ImportError:
            print_error(f"{package_name} not installed")
            missing_packages.append(package_name)

    if not missing_packages:
        print_success("All dependencies installed")
        return True, []
    else:
        return False, missing_packages

def check_tesseract() -> bool:
    """Check if Tesseract is installed"""
    print_header("4. Checking Tesseract OCR")

    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        print_success(f"Tesseract version: {version}")

        # Check for language packs
        try:
            langs = pytesseract.get_languages()
            if 'eng' in langs:
                print_success("English language pack installed")
            else:
                print_warning("English language pack not found")

            if 'spa' in langs:
                print_success("Spanish language pack installed")
            else:
                print_warning("Spanish language pack not found")

        except Exception as e:
            print_warning(f"Could not check language packs: {e}")

        return True

    except Exception as e:
        print_error(f"Tesseract not found or not configured: {e}")
        return False

def check_directories() -> bool:
    """Check if upload directories exist"""
    print_header("5. Checking Upload Directories")

    upload_dir = "uploads/ocr"
    if check_file_exists(upload_dir):
        print_success(f"Upload directory exists: {upload_dir}")

        # Check permissions
        if os.access(upload_dir, os.W_OK):
            print_success("Upload directory is writable")
        else:
            print_error("Upload directory is not writable")
            return False

        return True
    else:
        print_error(f"Upload directory missing: {upload_dir}")
        print_warning("Run: mkdir -p uploads/ocr")
        return False

def check_configuration() -> bool:
    """Check environment configuration"""
    print_header("6. Checking Configuration")

    if not check_file_exists(".env"):
        print_warning(".env file not found (optional)")
        return True

    # Read .env file
    try:
        with open(".env", "r") as f:
            env_content = f.read()

        # Check for OCR settings
        ocr_settings = [
            "TESSERACT_PATH",
            "TESSERACT_LANG",
            "OCR_CONFIDENCE_THRESHOLD",
            "MAX_IMAGE_SIZE_MB",
        ]

        missing_settings = []
        for setting in ocr_settings:
            if setting in env_content:
                print_success(f"{setting} configured")
            else:
                print_warning(f"{setting} not found in .env")
                missing_settings.append(setting)

        if not missing_settings:
            print_success("All OCR settings configured")
            return True
        else:
            print_warning(f"Missing {len(missing_settings)} optional settings")
            return True

    except Exception as e:
        print_error(f"Error reading .env: {e}")
        return False

def check_tests() -> bool:
    """Check if test file exists"""
    print_header("7. Checking Tests")

    test_file = "tests/unit/test_ocr.py"
    if check_file_exists(test_file):
        print_success(f"Test file exists: {test_file}")

        # Count tests
        try:
            with open(test_file, "r") as f:
                content = f.read()
                test_count = content.count("def test_")
                print_success(f"Found {test_count} test functions")
        except Exception as e:
            print_warning(f"Could not count tests: {e}")

        return True
    else:
        print_error(f"Test file missing: {test_file}")
        return False

def check_integration() -> bool:
    """Check if OCR is integrated in main app"""
    print_header("8. Checking Integration")

    # Check main.py
    if check_file_exists("main.py"):
        with open("main.py", "r") as f:
            content = f.read()

        if "from modules.ocr.router import router as ocr_router" in content:
            print_success("OCR router imported in main.py")
        else:
            print_error("OCR router not imported in main.py")
            return False

        if "app.include_router(ocr_router" in content:
            print_success("OCR router registered in main.py")
        else:
            print_error("OCR router not registered in main.py")
            return False

    else:
        print_error("main.py not found")
        return False

    # Check Celery
    if check_file_exists("celery_tasks/__init__.py"):
        with open("celery_tasks/__init__.py", "r") as f:
            content = f.read()

        if "modules.ocr.tasks" in content:
            print_success("OCR tasks registered in Celery")
        else:
            print_error("OCR tasks not registered in Celery")
            return False
    else:
        print_error("celery_tasks/__init__.py not found")
        return False

    print_success("All integrations complete")
    return True

def main():
    """Run all verification checks"""
    print(f"\n{Colors.BLUE}{'=' * 60}")
    print(f"OnQuota OCR Module - Setup Verification")
    print(f"{'=' * 60}{Colors.RESET}\n")

    # Change to backend directory if not already there
    if Path("modules/ocr").exists():
        pass  # Already in backend directory
    elif Path("backend/modules/ocr").exists():
        os.chdir("backend")
        print_success("Changed to backend directory")
    else:
        print_error("Could not find OCR module. Please run from project root or backend directory.")
        sys.exit(1)

    results = {}

    # Run all checks
    results['module_files'], missing_files = check_module_files()
    results['migration'] = check_migration()
    results['dependencies'], missing_packages = check_dependencies()
    results['tesseract'] = check_tesseract()
    results['directories'] = check_directories()
    results['configuration'] = check_configuration()
    results['tests'] = check_tests()
    results['integration'] = check_integration()

    # Summary
    print_header("Verification Summary")

    total_checks = len(results)
    passed_checks = sum(1 for v in results.values() if v)

    for check, status in results.items():
        status_icon = "✓" if status else "✗"
        status_color = Colors.GREEN if status else Colors.RED
        print(f"{status_color}{status_icon} {check.replace('_', ' ').title()}{Colors.RESET}")

    print(f"\n{Colors.BLUE}{'=' * 60}{Colors.RESET}")
    print(f"Results: {passed_checks}/{total_checks} checks passed")

    if passed_checks == total_checks:
        print_success("\nOCR module is fully set up and ready to use!")
        print(f"\n{Colors.BLUE}Next steps:{Colors.RESET}")
        print("  1. Start Celery worker: celery -A celery_tasks.celery_app worker --loglevel=info")
        print("  2. Start API server: uvicorn main:app --reload")
        print("  3. Test endpoint: curl -F file=@receipt.jpg http://localhost:8000/api/v1/ocr/process")
        return 0
    else:
        print_error("\nSome checks failed. Please review the errors above.")

        # Provide remediation steps
        if missing_files:
            print(f"\n{Colors.YELLOW}Missing files:{Colors.RESET}")
            for file in missing_files:
                print(f"  - {file}")

        if missing_packages:
            print(f"\n{Colors.YELLOW}Install missing packages:{Colors.RESET}")
            print(f"  pip install {' '.join(missing_packages)}")

        if not results['tesseract']:
            print(f"\n{Colors.YELLOW}Install Tesseract:{Colors.RESET}")
            print("  Ubuntu/Debian: sudo apt-get install tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng")
            print("  macOS: brew install tesseract tesseract-lang")

        if not results['directories']:
            print(f"\n{Colors.YELLOW}Create upload directory:{Colors.RESET}")
            print("  mkdir -p uploads/ocr")
            print("  chmod 755 uploads/ocr")

        return 1

if __name__ == "__main__":
    sys.exit(main())

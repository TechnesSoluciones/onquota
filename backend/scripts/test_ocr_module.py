#!/usr/bin/env python3
"""
Script de prueba para el módulo OCR
Verifica la configuración y procesa una imagen de prueba
"""
import asyncio
import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import settings
from core.logging import get_logger
from modules.ocr.processor import ImageProcessor, ImageValidationError
from modules.ocr.engine import OCREngine

logger = get_logger(__name__)


async def test_ocr_configuration():
    """Verifica la configuración de OCR"""
    print("=" * 60)
    print("VERIFICACIÓN DE CONFIGURACIÓN OCR")
    print("=" * 60)

    # Check Tesseract
    print(f"\n1. Tesseract Path: {settings.TESSERACT_PATH}")

    import subprocess
    try:
        result = subprocess.run(
            [settings.TESSERACT_PATH, "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        version = result.stdout.split("\n")[0]
        print(f"   Status: ✅ INSTALLED - {version}")
    except FileNotFoundError:
        print(f"   Status: ❌ NOT FOUND")
        print(f"   Instalar: brew install tesseract (macOS) o apt-get install tesseract-ocr (Ubuntu)")
        return False
    except Exception as e:
        print(f"   Status: ❌ ERROR - {e}")
        return False

    # Check language support
    print(f"\n2. Tesseract Language: {settings.TESSERACT_LANG}")
    try:
        result = subprocess.run(
            [settings.TESSERACT_PATH, "--list-langs"],
            capture_output=True,
            text=True,
            timeout=5
        )
        languages = result.stdout.strip().split("\n")[1:]  # Skip first line
        required_langs = settings.TESSERACT_LANG.split("+")

        all_available = True
        for lang in required_langs:
            if lang in languages:
                print(f"   - {lang}: ✅ Available")
            else:
                print(f"   - {lang}: ❌ Missing")
                all_available = False

        if not all_available:
            print(f"   Instalar idiomas faltantes:")
            print(f"   macOS: brew install tesseract-lang")
            print(f"   Ubuntu: apt-get install tesseract-ocr-spa tesseract-ocr-eng")
            return False

    except Exception as e:
        print(f"   Status: ❌ ERROR - {e}")
        return False

    # Check dependencies
    print(f"\n3. Python Dependencies:")
    dependencies = {
        "pytesseract": "pytesseract",
        "cv2": "opencv-python",
        "PIL": "Pillow",
        "numpy": "numpy",
    }

    for module, package in dependencies.items():
        try:
            __import__(module)
            print(f"   - {package}: ✅ Installed")
        except ImportError:
            print(f"   - {package}: ❌ Missing")
            print(f"     Install: pip install {package}")
            return False

    # Check settings
    print(f"\n4. OCR Settings:")
    print(f"   - Confidence Threshold: {settings.OCR_CONFIDENCE_THRESHOLD}")
    print(f"   - Max Image Size: {settings.MAX_IMAGE_SIZE_MB}MB")
    print(f"   - Upload Directory: uploads/ocr/")

    # Create upload directory if doesn't exist
    upload_dir = Path("uploads/ocr")
    if not upload_dir.exists():
        upload_dir.mkdir(parents=True, exist_ok=True)
        print(f"   - Upload directory created: ✅")
    else:
        print(f"   - Upload directory exists: ✅")

    print("\n✅ CONFIGURACIÓN COMPLETA")
    return True


async def test_image_processing():
    """Prueba el procesamiento de imágenes"""
    print("\n" + "=" * 60)
    print("PRUEBA DE PROCESAMIENTO DE IMÁGENES")
    print("=" * 60)

    # Create a simple test image
    import numpy as np
    import cv2

    # Create white background
    img = np.ones((600, 800, 3), dtype=np.uint8) * 255

    # Add text
    font = cv2.FONT_HERSHEY_SIMPLEX
    cv2.putText(img, "SHELL GAS STATION", (50, 100), font, 1.2, (0, 0, 0), 2)
    cv2.putText(img, "123 Main Street", (50, 150), font, 0.8, (0, 0, 0), 1)
    cv2.putText(img, "Date: 11/15/2025", (50, 200), font, 0.8, (0, 0, 0), 1)
    cv2.putText(img, "", (50, 250), font, 0.8, (0, 0, 0), 1)
    cv2.putText(img, "Gasoline Premium  12.5 gal", (50, 300), font, 0.7, (0, 0, 0), 1)
    cv2.putText(img, "$4.25 x 12.5 = $53.13", (400, 300), font, 0.7, (0, 0, 0), 1)
    cv2.putText(img, "", (50, 350), font, 0.8, (0, 0, 0), 1)
    cv2.putText(img, "Subtotal: $53.13", (50, 400), font, 0.8, (0, 0, 0), 1)
    cv2.putText(img, "Tax: $4.25", (50, 450), font, 0.8, (0, 0, 0), 1)
    cv2.putText(img, "Total: $57.38", (50, 500), font, 1.0, (0, 0, 0), 2)

    # Save test image
    test_image_path = Path("test_receipt.jpg")
    cv2.imwrite(str(test_image_path), img)
    print(f"\n1. Test image created: {test_image_path}")

    # Validate image
    print(f"\n2. Validating image...")
    is_valid, error_msg = ImageProcessor.validate_image(str(test_image_path))

    if is_valid:
        print(f"   Status: ✅ VALID")
    else:
        print(f"   Status: ❌ INVALID - {error_msg}")
        return False

    # Get image info
    info = ImageProcessor.get_image_info(str(test_image_path))
    print(f"\n3. Image Information:")
    print(f"   - Filename: {info['filename']}")
    print(f"   - Size: {info['file_size']} bytes")
    print(f"   - Dimensions: {info['width']}x{info['height']}px")
    print(f"   - Channels: {info['channels']}")
    print(f"   - Format: {info['format']}")

    # Preprocess image
    print(f"\n4. Preprocessing image...")
    try:
        preprocessed = ImageProcessor.preprocess(
            str(test_image_path),
            output_path="test_receipt_preprocessed.jpg"
        )
        print(f"   Status: ✅ PREPROCESSED")
        print(f"   - Output shape: {preprocessed.shape}")
        print(f"   - Saved to: test_receipt_preprocessed.jpg")
    except Exception as e:
        print(f"   Status: ❌ ERROR - {e}")
        return False

    print("\n✅ PROCESAMIENTO DE IMAGEN EXITOSO")
    return True, test_image_path


async def test_ocr_extraction(test_image_path):
    """Prueba la extracción OCR"""
    print("\n" + "=" * 60)
    print("PRUEBA DE EXTRACCIÓN OCR")
    print("=" * 60)

    # Initialize OCR engine
    print(f"\n1. Initializing OCR engine...")
    engine = OCREngine(lang=settings.TESSERACT_LANG)
    print(f"   Status: ✅ INITIALIZED")
    print(f"   - Language: {engine.lang}")

    # Preprocess image
    print(f"\n2. Preprocessing image...")
    preprocessed = ImageProcessor.preprocess(str(test_image_path))

    # Extract text
    print(f"\n3. Extracting raw text...")
    try:
        raw_text = await engine.extract_text(preprocessed)
        print(f"   Status: ✅ TEXT EXTRACTED")
        print(f"   - Characters: {len(raw_text)}")
        print(f"\n   Raw text:")
        print("   " + "-" * 56)
        for line in raw_text.split("\n")[:10]:  # First 10 lines
            print(f"   {line}")
        print("   " + "-" * 56)
    except Exception as e:
        print(f"   Status: ❌ ERROR - {e}")
        return False

    # Extract structured data
    print(f"\n4. Extracting structured data...")
    try:
        extracted_data, confidence = await engine.extract_structured_data(raw_text)
        print(f"   Status: ✅ DATA EXTRACTED")
        print(f"   - Confidence: {confidence:.2%}")

        print(f"\n   Extracted Data:")
        print("   " + "-" * 56)
        print(f"   Provider: {extracted_data.get('provider', 'N/A')}")
        print(f"   Amount: ${extracted_data.get('amount', 'N/A')} {extracted_data.get('currency', 'USD')}")
        print(f"   Date: {extracted_data.get('date', 'N/A')}")
        print(f"   Category: {extracted_data.get('category', 'N/A')}")
        print(f"   Receipt #: {extracted_data.get('receipt_number', 'N/A')}")

        if extracted_data.get('tax_amount'):
            print(f"   Tax: ${extracted_data['tax_amount']}")
        if extracted_data.get('subtotal'):
            print(f"   Subtotal: ${extracted_data['subtotal']}")

        items = extracted_data.get('items', [])
        if items:
            print(f"\n   Line Items ({len(items)}):")
            for i, item in enumerate(items[:5], 1):  # First 5 items
                print(f"   {i}. {item.get('description', 'N/A')} - ${item.get('total', 'N/A')}")

        print("   " + "-" * 56)

    except Exception as e:
        print(f"   Status: ❌ ERROR - {e}")
        import traceback
        traceback.print_exc()
        return False

    print("\n✅ EXTRACCIÓN OCR EXITOSA")
    return True


async def main():
    """Función principal"""
    print("\n" + "=" * 60)
    print("SCRIPT DE PRUEBA - MÓDULO OCR")
    print("OnQuota Backend")
    print("=" * 60)

    # Test 1: Configuration
    config_ok = await test_ocr_configuration()
    if not config_ok:
        print("\n❌ CONFIGURACIÓN INCOMPLETA")
        print("Por favor, instalar las dependencias faltantes y volver a ejecutar.")
        return 1

    # Test 2: Image Processing
    result = await test_image_processing()
    if not result:
        print("\n❌ PROCESAMIENTO DE IMAGEN FALLÓ")
        return 1

    processing_ok, test_image_path = result

    # Test 3: OCR Extraction
    extraction_ok = await test_ocr_extraction(test_image_path)
    if not extraction_ok:
        print("\n❌ EXTRACCIÓN OCR FALLÓ")
        return 1

    # Summary
    print("\n" + "=" * 60)
    print("RESUMEN DE PRUEBAS")
    print("=" * 60)
    print("✅ Configuración: OK")
    print("✅ Procesamiento de imagen: OK")
    print("✅ Extracción OCR: OK")
    print("\n🎉 TODAS LAS PRUEBAS PASARON")
    print("=" * 60)

    # Cleanup
    print("\nLimpiando archivos de prueba...")
    if test_image_path.exists():
        test_image_path.unlink()
        print("   - test_receipt.jpg eliminado")

    preprocessed_path = Path("test_receipt_preprocessed.jpg")
    if preprocessed_path.exists():
        preprocessed_path.unlink()
        print("   - test_receipt_preprocessed.jpg eliminado")

    print("\n✅ El módulo OCR está listo para usar!")
    print("\nPróximos pasos:")
    print("1. Aplicar migración: alembic upgrade head")
    print("2. Iniciar Celery worker: celery -A celery_tasks.celery_app worker")
    print("3. Probar API: POST /api/v1/ocr/process")

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

"""
Image preprocessing for OCR accuracy improvement
Uses OpenCV for image enhancement and preparation
"""
import os
import math
from pathlib import Path
from typing import Tuple, Optional
import cv2
import numpy as np
from PIL import Image
from core.config import settings
from core.logging import get_logger

logger = get_logger(__name__)


class ImageValidationError(Exception):
    """Raised when image validation fails"""
    pass


class ImageProcessor:
    """
    Image preprocessing pipeline for OCR
    Improves OCR accuracy through image enhancement techniques
    """

    # Constants
    MAX_IMAGE_SIZE = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024  # bytes
    MAX_DIMENSION = 3000  # pixels
    MIN_DIMENSION = 300  # pixels
    ALLOWED_FORMATS = {".jpg", ".jpeg", ".png", ".pdf"}
    ALLOWED_MIME_TYPES = {
        "image/jpeg",
        "image/png",
        "application/pdf",
    }

    @staticmethod
    def validate_image(image_path: str) -> Tuple[bool, str]:
        """
        Validate image file before processing

        Args:
            image_path: Path to image file

        Returns:
            Tuple of (is_valid, error_message)
        """
        path = Path(image_path)

        # Check if file exists
        if not path.exists():
            return False, "File does not exist"

        # Check file extension
        if path.suffix.lower() not in ImageProcessor.ALLOWED_FORMATS:
            return False, f"Invalid format. Allowed: {ImageProcessor.ALLOWED_FORMATS}"

        # Check file size
        file_size = path.stat().st_size
        if file_size > ImageProcessor.MAX_IMAGE_SIZE:
            max_mb = ImageProcessor.MAX_IMAGE_SIZE / (1024 * 1024)
            return False, f"File too large. Max size: {max_mb}MB"

        if file_size == 0:
            return False, "File is empty"

        # Try to open image
        try:
            if path.suffix.lower() == ".pdf":
                # PDF validation - just check if it's a valid PDF
                with open(image_path, "rb") as f:
                    header = f.read(5)
                    if header != b"%PDF-":
                        return False, "Invalid PDF file"
            else:
                # Image validation
                img = cv2.imread(str(path))
                if img is None:
                    return False, "Cannot read image file"

                height, width = img.shape[:2]
                if width < ImageProcessor.MIN_DIMENSION or height < ImageProcessor.MIN_DIMENSION:
                    return False, f"Image too small. Min: {ImageProcessor.MIN_DIMENSION}x{ImageProcessor.MIN_DIMENSION}px"

        except Exception as e:
            logger.error(f"Image validation error: {e}")
            return False, f"Invalid image file: {str(e)}"

        return True, ""

    @staticmethod
    def preprocess(image_path: str, output_path: Optional[str] = None) -> np.ndarray:
        """
        Complete preprocessing pipeline for OCR

        Steps:
        1. Load image
        2. Convert to grayscale
        3. Resize if too large
        4. Denoise
        5. Increase contrast
        6. Deskew (correct rotation)
        7. Apply adaptive thresholding

        Args:
            image_path: Path to input image
            output_path: Optional path to save preprocessed image

        Returns:
            Preprocessed image as numpy array

        Raises:
            ImageValidationError: If image validation fails
        """
        # Validate image
        is_valid, error_msg = ImageProcessor.validate_image(image_path)
        if not is_valid:
            raise ImageValidationError(error_msg)

        logger.info(f"Preprocessing image: {image_path}")

        # Load image
        img = cv2.imread(image_path)
        if img is None:
            raise ImageValidationError("Failed to load image")

        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        logger.debug("Converted to grayscale")

        # Resize if too large
        gray = ImageProcessor._resize_if_needed(gray)

        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray, None, h=10, templateWindowSize=7, searchWindowSize=21)
        logger.debug("Applied denoising")

        # Increase contrast using CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        contrasted = clahe.apply(denoised)
        logger.debug("Enhanced contrast")

        # Deskew
        deskewed = ImageProcessor._deskew(contrasted)
        logger.debug("Applied deskewing")

        # Adaptive thresholding
        binary = cv2.adaptiveThreshold(
            deskewed,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2,
        )
        logger.debug("Applied adaptive thresholding")

        # Optional: Save preprocessed image
        if output_path:
            cv2.imwrite(output_path, binary)
            logger.info(f"Saved preprocessed image to: {output_path}")

        return binary

    @staticmethod
    def _resize_if_needed(img: np.ndarray) -> np.ndarray:
        """
        Resize image if dimensions exceed maximum

        Args:
            img: Input image

        Returns:
            Resized image or original if within limits
        """
        height, width = img.shape[:2]
        max_dim = max(height, width)

        if max_dim > ImageProcessor.MAX_DIMENSION:
            scale = ImageProcessor.MAX_DIMENSION / max_dim
            new_width = int(width * scale)
            new_height = int(height * scale)
            resized = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)
            logger.debug(f"Resized from {width}x{height} to {new_width}x{new_height}")
            return resized

        return img

    @staticmethod
    def _deskew(img: np.ndarray) -> np.ndarray:
        """
        Detect and correct image skew/rotation

        Uses Hough Line Transform to detect dominant angle

        Args:
            img: Input image

        Returns:
            Deskewed image
        """
        # Detect edges
        edges = cv2.Canny(img, 50, 150, apertureSize=3)

        # Detect lines using Hough transform
        lines = cv2.HoughLines(edges, 1, np.pi / 180, 200)

        if lines is None or len(lines) == 0:
            logger.debug("No lines detected, skipping deskew")
            return img

        # Calculate angles
        angles = []
        for line in lines:
            rho, theta = line[0]
            angle = (theta * 180 / np.pi) - 90
            angles.append(angle)

        # Get median angle
        median_angle = np.median(angles)

        # Only correct if angle is significant (> 0.5 degrees)
        if abs(median_angle) < 0.5:
            logger.debug(f"Skew angle {median_angle:.2f}° too small, skipping correction")
            return img

        # Rotate image
        height, width = img.shape[:2]
        center = (width // 2, height // 2)
        rotation_matrix = cv2.getRotationMatrix2D(center, median_angle, 1.0)
        rotated = cv2.warpAffine(
            img,
            rotation_matrix,
            (width, height),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )

        logger.debug(f"Corrected skew by {median_angle:.2f}°")
        return rotated

    @staticmethod
    def get_image_info(image_path: str) -> dict:
        """
        Get image metadata

        Args:
            image_path: Path to image

        Returns:
            Dictionary with image info
        """
        path = Path(image_path)
        file_size = path.stat().st_size

        try:
            img = cv2.imread(str(path))
            if img is not None:
                height, width = img.shape[:2]
                channels = img.shape[2] if len(img.shape) > 2 else 1
            else:
                height = width = channels = 0
        except Exception:
            height = width = channels = 0

        return {
            "filename": path.name,
            "file_size": file_size,
            "width": width,
            "height": height,
            "channels": channels,
            "format": path.suffix.lower(),
        }

    @staticmethod
    def convert_pdf_to_image(pdf_path: str, output_path: str, dpi: int = 300) -> str:
        """
        Convert first page of PDF to image

        Args:
            pdf_path: Path to PDF file
            output_path: Path for output image
            dpi: DPI for conversion (higher = better quality)

        Returns:
            Path to converted image

        Note:
            Requires pdf2image library (not included by default)
        """
        try:
            from pdf2image import convert_from_path

            images = convert_from_path(pdf_path, dpi=dpi, first_page=1, last_page=1)
            if images:
                images[0].save(output_path, "PNG")
                logger.info(f"Converted PDF to image: {output_path}")
                return output_path
            else:
                raise ValueError("No pages in PDF")

        except ImportError:
            raise ImportError("pdf2image library required for PDF processing. Install with: pip install pdf2image")
        except Exception as e:
            logger.error(f"PDF conversion error: {e}")
            raise

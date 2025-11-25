#!/bin/bash

# OCR Module Setup Script
# Sets up Tesseract OCR and creates necessary directories

set -e

echo "==================================="
echo "OnQuota OCR Module Setup"
echo "==================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root (for system installs)
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root. This is recommended for system-wide installation.${NC}"
fi

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo -e "${RED}Unsupported OS: $OSTYPE${NC}"
    exit 1
fi

echo "Detected OS: $OS"
echo ""

# Install Tesseract
echo "Step 1: Installing Tesseract OCR..."
echo "-----------------------------------"

if [ "$OS" == "linux" ]; then
    # Check if apt-get is available
    if command -v apt-get &> /dev/null; then
        echo "Installing via apt-get..."
        apt-get update
        apt-get install -y tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng
    elif command -v yum &> /dev/null; then
        echo "Installing via yum..."
        yum install -y tesseract tesseract-langpack-spa tesseract-langpack-eng
    else
        echo -e "${RED}Error: No supported package manager found (apt-get or yum)${NC}"
        exit 1
    fi
elif [ "$OS" == "macos" ]; then
    # Check if Homebrew is available
    if ! command -v brew &> /dev/null; then
        echo -e "${RED}Error: Homebrew not found. Please install Homebrew first:${NC}"
        echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi

    echo "Installing via Homebrew..."
    brew install tesseract tesseract-lang
fi

# Verify Tesseract installation
if command -v tesseract &> /dev/null; then
    TESSERACT_VERSION=$(tesseract --version | head -n 1)
    echo -e "${GREEN}✓ Tesseract installed: $TESSERACT_VERSION${NC}"
    TESSERACT_PATH=$(which tesseract)
    echo "  Path: $TESSERACT_PATH"
else
    echo -e "${RED}✗ Tesseract installation failed${NC}"
    exit 1
fi

echo ""

# Install Python dependencies
echo "Step 2: Installing Python dependencies..."
echo "-----------------------------------"

if [ -f "requirements.txt" ]; then
    pip install pytesseract Pillow opencv-python numpy python-dateutil pdf2image
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
else
    echo -e "${YELLOW}Warning: requirements.txt not found in current directory${NC}"
    echo "  Please run this script from the backend directory"
fi

echo ""

# Create upload directories
echo "Step 3: Creating upload directories..."
echo "-----------------------------------"

mkdir -p uploads/ocr
chmod 755 uploads
chmod 755 uploads/ocr

echo -e "${GREEN}✓ Created uploads/ocr directory${NC}"
echo ""

# Update .env file
echo "Step 4: Updating .env configuration..."
echo "-----------------------------------"

if [ -f ".env" ]; then
    # Check if OCR settings already exist
    if grep -q "TESSERACT_PATH" .env; then
        echo -e "${YELLOW}OCR settings already exist in .env${NC}"
    else
        echo "" >> .env
        echo "# OCR Settings" >> .env
        echo "TESSERACT_PATH=$TESSERACT_PATH" >> .env
        echo "TESSERACT_LANG=spa+eng" >> .env
        echo "OCR_CONFIDENCE_THRESHOLD=0.75" >> .env
        echo "MAX_IMAGE_SIZE_MB=10" >> .env
        echo -e "${GREEN}✓ Added OCR settings to .env${NC}"
    fi
else
    echo -e "${YELLOW}Warning: .env file not found${NC}"
    echo "  Creating .env from .env.example..."

    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "" >> .env
        echo "# OCR Settings" >> .env
        echo "TESSERACT_PATH=$TESSERACT_PATH" >> .env
        echo "TESSERACT_LANG=spa+eng" >> .env
        echo "OCR_CONFIDENCE_THRESHOLD=0.75" >> .env
        echo "MAX_IMAGE_SIZE_MB=10" >> .env
        echo -e "${GREEN}✓ Created .env with OCR settings${NC}"
    else
        echo -e "${RED}Error: .env.example not found${NC}"
    fi
fi

echo ""

# Run database migration
echo "Step 5: Running database migration..."
echo "-----------------------------------"

if command -v alembic &> /dev/null; then
    echo "Running Alembic migration for OCR tables..."
    alembic upgrade head
    echo -e "${GREEN}✓ Database migration completed${NC}"
else
    echo -e "${YELLOW}Warning: Alembic not found. Please run migration manually:${NC}"
    echo "  alembic upgrade head"
fi

echo ""

# Test Tesseract
echo "Step 6: Testing Tesseract..."
echo "-----------------------------------"

# Create test image with text
echo "Creating test image..."
python3 << EOF
from PIL import Image, ImageDraw, ImageFont
import os

# Create a simple test image
img = Image.new('RGB', (400, 100), color='white')
draw = ImageDraw.Draw(img)

# Draw test text
draw.text((10, 30), "Test Receipt - Total: \$50.00", fill='black')

# Save
img.save('/tmp/ocr_test.png')
print("Test image created: /tmp/ocr_test.png")
EOF

# Run Tesseract on test image
if [ -f "/tmp/ocr_test.png" ]; then
    echo "Running OCR on test image..."
    tesseract /tmp/ocr_test.png stdout

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Tesseract test successful${NC}"
    else
        echo -e "${RED}✗ Tesseract test failed${NC}"
    fi

    # Cleanup
    rm /tmp/ocr_test.png
fi

echo ""

# Summary
echo "==================================="
echo "Setup Complete!"
echo "==================================="
echo ""
echo "Configuration:"
echo "  Tesseract Path: $TESSERACT_PATH"
echo "  Languages: Spanish + English"
echo "  Upload Directory: uploads/ocr"
echo ""
echo "Next steps:"
echo "  1. Start Celery worker: celery -A celery_tasks.celery_app worker --loglevel=info"
echo "  2. Start API server: uvicorn main:app --reload"
echo "  3. Test OCR endpoint: curl -F file=@receipt.jpg http://localhost:8000/api/v1/ocr/process"
echo ""
echo -e "${GREEN}OCR Module is ready to use!${NC}"

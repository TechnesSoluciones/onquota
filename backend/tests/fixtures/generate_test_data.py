"""
Generate realistic test sales data for Analytics module
Creates Excel and CSV files with 1000+ rows of sample data
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from pathlib import Path
import random

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# Configuration
NUM_ROWS = 1500
OUTPUT_DIR = Path(__file__).parent
EXCEL_FILE = OUTPUT_DIR / "test_sales_data.xlsx"
CSV_FILE = OUTPUT_DIR / "test_sales_data.csv"

# Product catalog
PRODUCTS = [
    ("Laptop HP ProBook 450", 800, 500),
    ("Monitor Dell 27\"", 350, 200),
    ("Keyboard Logitech MX Keys", 120, 60),
    ("Mouse Logitech MX Master", 100, 50),
    ("Webcam Logitech C920", 80, 40),
    ("Headset Jabra Evolve 65", 150, 75),
    ("Docking Station USB-C", 200, 100),
    ("Cable HDMI 2m", 15, 5),
    ("USB Hub 7 Ports", 40, 20),
    ("External SSD 1TB", 180, 90),
    ("RAM DDR4 16GB", 90, 45),
    ("Graphics Card RTX 3060", 450, 300),
    ("Power Supply 650W", 110, 60),
    ("CPU Cooler Noctua", 85, 45),
    ("Motherboard ASUS", 220, 120),
    ("Case Fractal Design", 130, 70),
    ("Thermal Paste Arctic", 10, 3),
    ("WiFi Adapter PCIe", 45, 25),
    ("Sound Card Creative", 120, 60),
    ("RGB LED Strip 5m", 35, 15),
]

# Client list
CLIENTS = [
    "Acme Corporation",
    "TechStart Inc",
    "Global Solutions LLC",
    "Innovation Labs",
    "Digital Dynamics",
    "Smart Systems Co",
    "Future Tech Group",
    "Advanced Computing",
    "Enterprise Solutions",
    "Prime Technology",
    "Quantum Systems",
    "Alpha Industries",
    "Beta Technologies",
    "Gamma Enterprises",
    "Delta Corporation",
    "Epsilon Group",
    "Zeta Solutions",
    "Eta Systems",
    "Theta Tech",
    "Iota Innovations",
    "Kappa Computing",
    "Lambda Labs",
    "Micro Dynamics",
    "Nano Systems",
    "Omega Technologies",
]


def generate_sales_data():
    """Generate realistic sales data with patterns"""

    data = []

    # Generate dates over 6 months
    start_date = datetime(2024, 7, 1)
    end_date = datetime(2025, 1, 15)

    for i in range(NUM_ROWS):
        # Select product with weighted distribution (some products more popular)
        weights = [1.0] * 5 + [0.7] * 5 + [0.5] * 5 + [0.3] * 5
        product, base_price, cost = random.choices(PRODUCTS, weights=weights)[0]

        # Select client with weighted distribution (some clients buy more)
        client_weights = [2.0] * 5 + [1.5] * 8 + [1.0] * 7 + [0.5] * 5
        client = random.choices(CLIENTS, weights=client_weights)[0]

        # Random date
        days_diff = (end_date - start_date).days
        random_days = random.randint(0, days_diff)
        sale_date = start_date + timedelta(days=random_days)

        # Quantity follows a distribution (most sales are small, few are large)
        quantity = int(np.random.lognormal(1.5, 0.8))
        quantity = max(1, min(quantity, 100))  # Between 1 and 100

        # Price variation (±10% from base price)
        price_variation = np.random.normal(1.0, 0.1)
        unit_price = round(base_price * price_variation, 2)
        unit_price = max(base_price * 0.8, min(unit_price, base_price * 1.2))

        # Discount patterns:
        # - 70% no discount
        # - 20% small discount (5-10%)
        # - 10% larger discount (15-25%)
        discount_prob = random.random()
        if discount_prob < 0.70:
            discount = 0
        elif discount_prob < 0.90:
            discount = round(random.uniform(5, 10), 1)
        else:
            discount = round(random.uniform(15, 25), 1)

        # Big clients get more discounts
        if client in CLIENTS[:5] and discount == 0:
            if random.random() < 0.3:  # 30% chance
                discount = round(random.uniform(5, 15), 1)

        data.append(
            {
                "product": product,
                "client": client,
                "date": sale_date.strftime("%Y-%m-%d"),
                "quantity": quantity,
                "unit_price": unit_price,
                "discount": discount,
                "cost": cost,
            }
        )

    return pd.DataFrame(data)


def add_seasonal_patterns(df):
    """Add seasonal patterns to the data"""

    # Convert date to datetime
    df["date"] = pd.to_datetime(df["date"])

    # Increase quantities in November-December (holiday season)
    holiday_mask = df["date"].dt.month.isin([11, 12])
    df.loc[holiday_mask, "quantity"] = (df.loc[holiday_mask, "quantity"] * 1.3).astype(
        int
    )

    # Increase discounts in December (end of year sales)
    december_mask = df["date"].dt.month == 12
    df.loc[december_mask, "discount"] = (
        df.loc[december_mask, "discount"] + random.uniform(2, 5)
    )

    return df


def generate_test_files():
    """Generate Excel and CSV test files"""

    print("Generating sales data...")
    df = generate_sales_data()

    print("Adding seasonal patterns...")
    df = add_seasonal_patterns(df)

    # Convert date back to string for export
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")

    # Calculate statistics
    total_sales = (df["quantity"] * df["unit_price"]).sum()
    total_discount = (
        df["quantity"] * df["unit_price"] * (df["discount"] / 100)
    ).sum()
    unique_products = df["product"].nunique()
    unique_clients = df["client"].nunique()

    print("\n" + "=" * 60)
    print("SALES DATA STATISTICS")
    print("=" * 60)
    print(f"Total rows: {len(df):,}")
    print(f"Unique products: {unique_products}")
    print(f"Unique clients: {unique_clients}")
    print(f"Date range: {df['date'].min()} to {df['date'].max()}")
    print(f"Total sales (before discount): ${total_sales:,.2f}")
    print(f"Total discounts: ${total_discount:,.2f}")
    print(f"Net sales: ${total_sales - total_discount:,.2f}")
    print(f"Average sale: ${(df['quantity'] * df['unit_price']).mean():,.2f}")
    print(f"Average discount: {df[df['discount'] > 0]['discount'].mean():.1f}%")
    print(f"Rows with discount: {(df['discount'] > 0).sum()} ({(df['discount'] > 0).sum() / len(df) * 100:.1f}%)")
    print("=" * 60)

    # Export to Excel
    print(f"\nExporting to Excel: {EXCEL_FILE}")
    df.to_excel(EXCEL_FILE, index=False, sheet_name="Sales Data")

    # Export to CSV
    print(f"Exporting to CSV: {CSV_FILE}")
    df.to_csv(CSV_FILE, index=False)

    print("\n✓ Test data files generated successfully!")

    # Display sample
    print("\n" + "=" * 60)
    print("SAMPLE DATA (first 10 rows)")
    print("=" * 60)
    print(df.head(10).to_string(index=False))
    print("=" * 60)

    return df


if __name__ == "__main__":
    # Create fixtures directory if it doesn't exist
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Generate test files
    df = generate_test_files()

    print("\n📊 Test data generation complete!")
    print(f"📁 Files created:")
    print(f"   - {EXCEL_FILE}")
    print(f"   - {CSV_FILE}")

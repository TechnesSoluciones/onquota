"""
Sales Analyzer for SPA Analytics
Performs ABC classification, KPI calculation, and trend analysis
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from decimal import Decimal
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class SalesAnalyzer:
    """
    Analyzes sales data with ABC classification and advanced metrics

    Implements Pareto analysis (ABC classification), calculates KPIs,
    identifies trends, and generates actionable insights.
    """

    # ABC thresholds (cumulative percentage)
    ABC_THRESHOLDS = {
        "A": 0.70,  # 0-70% of sales
        "B": 0.90,  # 70-90% of sales
        "C": 1.00,  # 90-100% of sales
    }

    def __init__(self, df: pd.DataFrame):
        """
        Initialize analyzer with sales data

        Args:
            df: Clean DataFrame with sales data
        """
        if df is None or len(df) == 0:
            raise ValueError("DataFrame is empty")

        self.df = df.copy()
        self.has_client = "client" in df.columns
        self.has_date = "date" in df.columns
        self.has_discount = "discount" in df.columns
        self.has_cost = "cost" in df.columns and "margin" in df.columns

        logger.info(
            f"Initialized SalesAnalyzer with {len(df)} rows. "
            f"Has client: {self.has_client}, date: {self.has_date}, "
            f"discount: {self.has_discount}, cost: {self.has_cost}"
        )

    def calculate_summary_stats(self) -> Dict:
        """
        Calculate summary statistics

        Returns:
            Dictionary with summary statistics
        """
        sales_column = "total_after_discount" if self.has_discount else "total"

        stats = {
            "total_rows": int(len(self.df)),
            "total_sales": float(self.df[sales_column].sum()),
            "avg_sale": float(self.df[sales_column].mean()),
            "median_sale": float(self.df[sales_column].median()),
            "std_dev": float(self.df[sales_column].std()),
            "min_sale": float(self.df[sales_column].min()),
            "max_sale": float(self.df[sales_column].max()),
        }

        # Calculate percentiles
        percentiles = self.df[sales_column].quantile([0.25, 0.50, 0.75, 0.95])
        stats["percentiles"] = {
            "p25": float(percentiles[0.25]),
            "p50": float(percentiles[0.50]),
            "p75": float(percentiles[0.75]),
            "p95": float(percentiles[0.95]),
        }

        logger.info(f"Summary stats: {stats['total_rows']} rows, ${stats['total_sales']:,.2f} total sales")
        return stats

    def abc_analysis(self, by: str = "product") -> Dict:
        """
        Perform ABC classification (Pareto analysis)

        Args:
            by: Column to classify by ("product" or "client")

        Returns:
            Dictionary with ABC classification results
        """
        if by not in ["product", "client"]:
            raise ValueError("by must be 'product' or 'client'")

        if by == "client" and not self.has_client:
            return {}

        sales_column = "total_after_discount" if self.has_discount else "total"

        # Group by item and sum sales
        grouped = (
            self.df.groupby(by)
            .agg(
                {
                    sales_column: "sum",
                    "quantity": "sum",
                    "unit_price": "mean",
                }
            )
            .reset_index()
        )

        # Sort by sales descending
        grouped = grouped.sort_values(sales_column, ascending=False)

        # Calculate cumulative percentage
        total_sales = grouped[sales_column].sum()
        grouped["cumulative_sales"] = grouped[sales_column].cumsum()
        grouped["cumulative_percentage"] = grouped["cumulative_sales"] / total_sales

        # Assign ABC categories
        grouped["category"] = grouped["cumulative_percentage"].apply(self._assign_abc_category)

        # Calculate statistics for each category
        total_items = len(grouped)
        results = {}

        for category in ["A", "B", "C"]:
            category_data = grouped[grouped["category"] == category]
            count = len(category_data)
            sales = float(category_data[sales_column].sum())

            results[category] = {
                "count": count,
                "percentage": round((count / total_items) * 100, 2),
                "sales": sales,
                "sales_pct": round((sales / total_sales) * 100, 2),
            }

        # Store classified items for later use
        self._classified_items = {by: grouped}

        logger.info(
            f"ABC analysis by {by}: A={results['A']['count']}, "
            f"B={results['B']['count']}, C={results['C']['count']}"
        )

        return results

    def top_performers(self, by: str = "product", limit: int = 20) -> List[Dict]:
        """
        Get top N performers by sales

        Args:
            by: Column to rank by ("product" or "client")
            limit: Number of top items to return

        Returns:
            List of top performers with details
        """
        if by not in ["product", "client"]:
            raise ValueError("by must be 'product' or 'client'")

        if by == "client" and not self.has_client:
            return []

        # Get classified items from ABC analysis
        if not hasattr(self, "_classified_items") or by not in self._classified_items:
            # Run ABC analysis if not done yet
            self.abc_analysis(by=by)

        classified = self._classified_items[by]
        sales_column = "total_after_discount" if self.has_discount else "total"
        total_sales = self.df[sales_column].sum()

        # Get top N items
        top_items = classified.head(limit)

        results = []
        for _, row in top_items.iterrows():
            results.append(
                {
                    "name": row[by],
                    "sales": float(row[sales_column]),
                    "quantity": int(row["quantity"]),
                    "avg_price": float(row["unit_price"]),
                    "category": row["category"],
                    "percentage_of_total": round((row[sales_column] / total_sales) * 100, 2),
                }
            )

        return results

    def discount_analysis(self) -> Dict:
        """
        Analyze discount patterns and impact

        Returns:
            Dictionary with discount analysis results
        """
        if not self.has_discount:
            return {}

        # Filter only rows with discounts
        discounted = self.df[self.df["discount"] > 0]

        if len(discounted) == 0:
            return {
                "total_discounts": 0.0,
                "avg_discount_pct": 0.0,
                "discount_by_category": {},
                "top_discounted_products": [],
            }

        total_discount_amount = float(discounted["discount_amount"].sum())
        avg_discount_pct = float(discounted["discount"].mean())

        # Discount by ABC category (run product ABC if needed)
        if not hasattr(self, "_classified_items") or "product" not in self._classified_items:
            self.abc_analysis(by="product")

        # Merge categories with discount data
        product_discounts = (
            discounted.groupby("product")
            .agg(
                {
                    "discount_amount": "sum",
                    "discount": "mean",
                }
            )
            .reset_index()
        )

        classified = self._classified_items["product"]
        product_discounts = product_discounts.merge(classified[["product", "category"]], on="product", how="left")

        discount_by_category = {}
        for category in ["A", "B", "C"]:
            category_discounts = product_discounts[product_discounts["category"] == category]
            discount_by_category[category] = float(category_discounts["discount_amount"].sum())

        # Top discounted products
        top_discounted = product_discounts.nlargest(10, "discount_amount")
        top_discounted_list = []

        sales_column = "total_after_discount"
        for _, row in top_discounted.iterrows():
            product_data = self.df[self.df["product"] == row["product"]]
            top_discounted_list.append(
                {
                    "name": row["product"],
                    "sales": float(product_data[sales_column].sum()),
                    "quantity": int(product_data["quantity"].sum()),
                    "avg_price": float(product_data["unit_price"].mean()),
                    "category": row["category"],
                    "avg_discount": float(row["discount"]),
                    "total_discount_amount": float(row["discount_amount"]),
                }
            )

        return {
            "total_discounts": total_discount_amount,
            "avg_discount_pct": round(avg_discount_pct, 2),
            "discount_by_category": discount_by_category,
            "top_discounted_products": top_discounted_list,
            "rows_with_discount": len(discounted),
            "percentage_with_discount": round((len(discounted) / len(self.df)) * 100, 2),
        }

    def margin_analysis(self) -> Dict:
        """
        Analyze profit margins

        Returns:
            Dictionary with margin analysis results
        """
        if not self.has_cost:
            return {}

        total_margin = float(self.df["margin"].sum())
        sales_column = "total_after_discount" if self.has_discount else "total"
        total_sales = float(self.df[sales_column].sum())
        avg_margin_pct = (total_margin / total_sales * 100) if total_sales > 0 else 0

        # Margin by ABC category
        if not hasattr(self, "_classified_items") or "product" not in self._classified_items:
            self.abc_analysis(by="product")

        # Calculate margin by product
        product_margins = (
            self.df.groupby("product")
            .agg(
                {
                    "margin": "sum",
                    sales_column: "sum",
                    "quantity": "sum",
                    "unit_price": "mean",
                }
            )
            .reset_index()
        )

        product_margins["margin_pct"] = np.where(
            product_margins[sales_column] > 0,
            (product_margins["margin"] / product_margins[sales_column]) * 100,
            0,
        )

        # Merge with ABC categories
        classified = self._classified_items["product"]
        product_margins = product_margins.merge(classified[["product", "category"]], on="product", how="left")

        # Margin by category
        margin_by_category = {}
        for category in ["A", "B", "C"]:
            category_data = product_margins[product_margins["category"] == category]
            category_margin = float(category_data["margin"].sum())
            category_sales = float(category_data[sales_column].sum())
            margin_by_category[category] = {
                "total_margin": category_margin,
                "avg_margin_pct": round((category_margin / category_sales * 100) if category_sales > 0 else 0, 2),
            }

        # Top margin products
        top_margin = product_margins.nlargest(10, "margin")
        top_margin_list = self._format_margin_list(top_margin, sales_column)

        # Bottom margin products
        bottom_margin = product_margins.nsmallest(10, "margin")
        bottom_margin_list = self._format_margin_list(bottom_margin, sales_column)

        return {
            "total_margin": total_margin,
            "avg_margin_pct": round(avg_margin_pct, 2),
            "margin_by_category": margin_by_category,
            "top_margin_products": top_margin_list,
            "bottom_margin_products": bottom_margin_list,
        }

    def monthly_trends(self) -> List[Dict]:
        """
        Calculate monthly sales trends

        Returns:
            List of monthly trend data
        """
        if not self.has_date:
            return []

        # Extract month from date
        df_with_month = self.df.copy()
        df_with_month["month"] = df_with_month["date"].dt.to_period("M")

        sales_column = "total_after_discount" if self.has_discount else "total"

        # Group by month
        monthly = (
            df_with_month.groupby("month")
            .agg(
                {
                    sales_column: "sum",
                    "quantity": "sum",
                    "unit_price": "mean",
                }
            )
            .reset_index()
        )

        monthly = monthly.sort_values("month")

        # Calculate growth percentage
        monthly["growth_pct"] = monthly[sales_column].pct_change() * 100

        results = []
        for _, row in monthly.iterrows():
            results.append(
                {
                    "month": str(row["month"]),
                    "sales": float(row[sales_column]),
                    "quantity": int(row["quantity"]),
                    "avg_price": float(row["unit_price"]),
                    "growth_pct": round(float(row["growth_pct"]), 2) if pd.notna(row["growth_pct"]) else None,
                }
            )

        return results

    def generate_insights(self) -> List[str]:
        """
        Generate automated insights from analysis

        Returns:
            List of insight strings
        """
        insights = []

        # ABC insights
        if hasattr(self, "_classified_items") and "product" in self._classified_items:
            abc_results = self.abc_analysis(by="product")

            a_pct = abc_results["A"]["percentage"]
            a_sales_pct = abc_results["A"]["sales_pct"]
            insights.append(f"Top {a_pct:.0f}% of products generate {a_sales_pct:.0f}% of total sales (Category A)")

            c_pct = abc_results["C"]["percentage"]
            c_sales_pct = abc_results["C"]["sales_pct"]
            if c_sales_pct < 15:
                insights.append(
                    f"Bottom {c_pct:.0f}% of products contribute only {c_sales_pct:.0f}% of sales - consider discontinuing"
                )

        # Discount insights
        if self.has_discount:
            discount_data = self.discount_analysis()
            if discount_data:
                avg_discount = discount_data["avg_discount_pct"]
                total_discounts = discount_data["total_discounts"]
                insights.append(
                    f"Average discount is {avg_discount:.1f}%, total discount amount: ${total_discounts:,.2f}"
                )

                pct_with_discount = discount_data.get("percentage_with_discount", 0)
                if pct_with_discount > 50:
                    insights.append(f"{pct_with_discount:.0f}% of sales include discounts - consider pricing strategy")

        # Margin insights
        if self.has_cost:
            margin_data = self.margin_analysis()
            if margin_data:
                avg_margin = margin_data["avg_margin_pct"]
                insights.append(f"Overall profit margin is {avg_margin:.1f}%")

                # Category A margin
                cat_a_margin = margin_data["margin_by_category"].get("A", {}).get("avg_margin_pct", 0)
                if cat_a_margin > avg_margin:
                    diff = cat_a_margin - avg_margin
                    insights.append(f"Category A products have {diff:.1f}% higher margins than average")

        # Trend insights
        if self.has_date:
            trends = self.monthly_trends()
            if len(trends) >= 2:
                latest = trends[-1]
                if latest["growth_pct"] is not None:
                    if latest["growth_pct"] > 0:
                        insights.append(f"Sales grew {latest['growth_pct']:.1f}% compared to previous month")
                    else:
                        insights.append(f"Sales declined {abs(latest['growth_pct']):.1f}% compared to previous month")

        # Volume insights
        stats = self.calculate_summary_stats()
        total_sales = stats["total_sales"]
        total_rows = stats["total_rows"]
        avg_sale = stats["avg_sale"]

        insights.append(f"Analyzed {total_rows:,} transactions totaling ${total_sales:,.2f} in sales")

        median_sale = stats["median_sale"]
        if avg_sale > median_sale * 1.5:
            insights.append("Sales distribution is right-skewed - a few large transactions drive overall value")

        return insights

    def _assign_abc_category(self, cumulative_pct: float) -> str:
        """
        Assign ABC category based on cumulative percentage

        Args:
            cumulative_pct: Cumulative percentage (0-1)

        Returns:
            ABC category ("A", "B", or "C")
        """
        if cumulative_pct <= self.ABC_THRESHOLDS["A"]:
            return "A"
        elif cumulative_pct <= self.ABC_THRESHOLDS["B"]:
            return "B"
        else:
            return "C"

    def _format_margin_list(self, df: pd.DataFrame, sales_column: str) -> List[Dict]:
        """
        Format margin dataframe to list of dictionaries

        Args:
            df: DataFrame with margin data
            sales_column: Name of sales column

        Returns:
            List of formatted margin items
        """
        results = []
        for _, row in df.iterrows():
            results.append(
                {
                    "name": row["product"],
                    "sales": float(row[sales_column]),
                    "quantity": int(row["quantity"]),
                    "avg_price": float(row["unit_price"]),
                    "category": row["category"],
                    "margin": float(row["margin"]),
                    "margin_pct": round(float(row["margin_pct"]), 2),
                }
            )
        return results

    def generate_full_report(self) -> Dict:
        """
        Generate complete analysis report

        Returns:
            Dictionary with all analysis results
        """
        logger.info("Generating full analysis report")

        report = {
            "summary": self.calculate_summary_stats(),
            "abc_analysis": {},
            "insights": [],
        }

        # Product ABC analysis
        report["abc_analysis"]["by_product"] = self.abc_analysis(by="product")
        report["top_products"] = self.top_performers(by="product", limit=20)

        # Client analysis if available
        if self.has_client:
            report["abc_analysis"]["by_client"] = self.abc_analysis(by="client")
            report["top_clients"] = self.top_performers(by="client", limit=20)

        # Optional analyses
        if self.has_discount:
            report["discount_analysis"] = self.discount_analysis()

        if self.has_cost:
            report["margin_analysis"] = self.margin_analysis()

        if self.has_date:
            report["monthly_trends"] = self.monthly_trends()

        # Generate insights last (needs all analyses complete)
        report["insights"] = self.generate_insights()

        logger.info("Full analysis report generated successfully")
        return report

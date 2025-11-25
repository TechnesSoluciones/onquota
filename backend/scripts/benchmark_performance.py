"""
Performance Benchmarking Script
Measures API response times and database query performance

Usage:
    python scripts/benchmark_performance.py --endpoint dashboard
    python scripts/benchmark_performance.py --endpoint expenses --iterations 100
    python scripts/benchmark_performance.py --all
"""
import asyncio
import time
import statistics
import argparse
from typing import List, Dict, Any
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import AsyncSessionLocal, engine
from core.logging import get_logger
from core.cache import get_cache

logger = get_logger(__name__)


class PerformanceBenchmark:
    """Performance benchmarking utility"""

    def __init__(self):
        self.results: Dict[str, Any] = {}
        self.db_session: AsyncSession = None

    async def setup(self):
        """Setup database connection and cache"""
        self.db_session = AsyncSessionLocal()
        logger.info("Benchmark setup complete")

    async def cleanup(self):
        """Cleanup resources"""
        if self.db_session:
            await self.db_session.close()
        logger.info("Benchmark cleanup complete")

    async def measure_time(self, func, *args, **kwargs) -> Dict[str, Any]:
        """
        Measure execution time of async function

        Returns:
            Dict with timing metrics
        """
        start_time = time.perf_counter()
        result = await func(*args, **kwargs)
        end_time = time.perf_counter()

        execution_time = (end_time - start_time) * 1000  # Convert to milliseconds

        return {
            "execution_time_ms": round(execution_time, 2),
            "result": result
        }

    async def benchmark_query(
        self,
        query: str,
        name: str,
        iterations: int = 10
    ) -> Dict[str, Any]:
        """
        Benchmark a SQL query

        Args:
            query: SQL query to execute
            name: Benchmark name
            iterations: Number of times to run the query

        Returns:
            Dict with benchmark results
        """
        logger.info(f"Benchmarking {name} ({iterations} iterations)")

        execution_times: List[float] = []
        query_counts: List[int] = []

        for i in range(iterations):
            # Enable query logging
            start_queries = await self._get_query_count()

            start_time = time.perf_counter()
            result = await self.db_session.execute(text(query))
            await self.db_session.commit()
            end_time = time.perf_counter()

            end_queries = await self._get_query_count()

            execution_time = (end_time - start_time) * 1000
            execution_times.append(execution_time)
            query_counts.append(end_queries - start_queries)

        # Calculate statistics
        avg_time = statistics.mean(execution_times)
        min_time = min(execution_times)
        max_time = max(execution_times)
        median_time = statistics.median(execution_times)
        stdev_time = statistics.stdev(execution_times) if len(execution_times) > 1 else 0
        avg_queries = statistics.mean(query_counts)

        results = {
            "name": name,
            "iterations": iterations,
            "avg_time_ms": round(avg_time, 2),
            "min_time_ms": round(min_time, 2),
            "max_time_ms": round(max_time, 2),
            "median_time_ms": round(median_time, 2),
            "stdev_ms": round(stdev_time, 2),
            "avg_queries": round(avg_queries, 1),
            "total_time_ms": round(sum(execution_times), 2)
        }

        logger.info(f"{name}: avg={results['avg_time_ms']}ms, queries={results['avg_queries']}")

        return results

    async def _get_query_count(self) -> int:
        """Get current query count (PostgreSQL specific)"""
        try:
            result = await self.db_session.execute(
                text("SELECT pg_stat_get_db_numbackends(current_database())")
            )
            return result.scalar() or 0
        except:
            return 0

    async def benchmark_dashboard_kpis(self, iterations: int = 50) -> Dict[str, Any]:
        """
        Benchmark dashboard KPI endpoint
        Target: < 200ms average
        """
        from modules.dashboard.repository import DashboardRepository
        from uuid import uuid4

        # Use a test tenant ID
        tenant_id = uuid4()

        repo = DashboardRepository(self.db_session)
        execution_times: List[float] = []

        logger.info(f"Benchmarking Dashboard KPIs ({iterations} iterations)")

        for i in range(iterations):
            start_time = time.perf_counter()
            try:
                # Skip cache for accurate measurement
                result = await repo.get_kpis(tenant_id, skip_cache=True)
            except Exception as e:
                logger.warning(f"Dashboard KPI call failed: {e}")
                continue
            end_time = time.perf_counter()

            execution_time = (end_time - start_time) * 1000
            execution_times.append(execution_time)

        if not execution_times:
            return {"error": "All iterations failed"}

        avg_time = statistics.mean(execution_times)
        target_met = avg_time < 200

        results = {
            "endpoint": "Dashboard KPIs",
            "iterations": len(execution_times),
            "avg_time_ms": round(avg_time, 2),
            "min_time_ms": round(min(execution_times), 2),
            "max_time_ms": round(max(execution_times), 2),
            "median_time_ms": round(statistics.median(execution_times), 2),
            "target_ms": 200,
            "target_met": target_met,
            "status": "PASS" if target_met else "FAIL"
        }

        logger.info(
            f"Dashboard KPIs: avg={results['avg_time_ms']}ms "
            f"({results['status']} - target 200ms)"
        )

        return results

    async def benchmark_expenses_list(self, iterations: int = 50) -> Dict[str, Any]:
        """
        Benchmark expenses list endpoint
        Target: < 100ms average (with 1000+ records)
        """
        from modules.expenses.repository import ExpenseRepository
        from uuid import uuid4

        tenant_id = uuid4()
        repo = ExpenseRepository(self.db_session)
        execution_times: List[float] = []

        logger.info(f"Benchmarking Expenses List ({iterations} iterations)")

        for i in range(iterations):
            start_time = time.perf_counter()
            try:
                result = await repo.list_expenses(
                    tenant_id=tenant_id,
                    page=1,
                    page_size=100
                )
            except Exception as e:
                logger.warning(f"Expenses list call failed: {e}")
                continue
            end_time = time.perf_counter()

            execution_time = (end_time - start_time) * 1000
            execution_times.append(execution_time)

        if not execution_times:
            return {"error": "All iterations failed"}

        avg_time = statistics.mean(execution_times)
        target_met = avg_time < 100

        results = {
            "endpoint": "Expenses List",
            "iterations": len(execution_times),
            "avg_time_ms": round(avg_time, 2),
            "min_time_ms": round(min(execution_times), 2),
            "max_time_ms": round(max(execution_times), 2),
            "median_time_ms": round(statistics.median(execution_times), 2),
            "target_ms": 100,
            "target_met": target_met,
            "status": "PASS" if target_met else "FAIL"
        }

        logger.info(
            f"Expenses List: avg={results['avg_time_ms']}ms "
            f"({results['status']} - target 100ms)"
        )

        return results

    async def benchmark_cache_performance(self, iterations: int = 1000) -> Dict[str, Any]:
        """
        Benchmark Redis cache performance
        Target: < 5ms average for get/set operations
        """
        cache = await get_cache()
        get_times: List[float] = []
        set_times: List[float] = []

        logger.info(f"Benchmarking Cache Performance ({iterations} iterations)")

        test_key = "benchmark:test"
        test_value = {"test": "data", "timestamp": datetime.utcnow().isoformat()}

        for i in range(iterations):
            # Benchmark SET
            start_time = time.perf_counter()
            await cache.set(test_key, test_value, ttl=60)
            end_time = time.perf_counter()
            set_times.append((end_time - start_time) * 1000)

            # Benchmark GET
            start_time = time.perf_counter()
            await cache.get(test_key)
            end_time = time.perf_counter()
            get_times.append((end_time - start_time) * 1000)

        # Cleanup
        await cache.delete(test_key)

        avg_get = statistics.mean(get_times)
        avg_set = statistics.mean(set_times)
        target_met = avg_get < 5 and avg_set < 5

        results = {
            "operation": "Cache GET/SET",
            "iterations": iterations,
            "avg_get_ms": round(avg_get, 2),
            "avg_set_ms": round(avg_set, 2),
            "min_get_ms": round(min(get_times), 2),
            "min_set_ms": round(min(set_times), 2),
            "target_ms": 5,
            "target_met": target_met,
            "status": "PASS" if target_met else "FAIL"
        }

        logger.info(
            f"Cache: GET avg={results['avg_get_ms']}ms, "
            f"SET avg={results['avg_set_ms']}ms ({results['status']} - target 5ms)"
        )

        return results

    async def benchmark_connection_pool(self) -> Dict[str, Any]:
        """
        Benchmark database connection pool performance
        """
        logger.info("Benchmarking Connection Pool")

        pool = engine.pool

        results = {
            "pool_size": pool.size(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "checked_in": pool.checkedin(),
            "pool_timeout": 30,
            "pool_recycle": 3600
        }

        logger.info(f"Connection Pool: size={results['pool_size']}, "
                   f"checked_out={results['checked_out']}")

        return results

    def print_results(self):
        """Print benchmark results in formatted table"""
        print("\n" + "=" * 80)
        print("PERFORMANCE BENCHMARK RESULTS")
        print("=" * 80 + "\n")

        for category, data in self.results.items():
            print(f"\n{category}")
            print("-" * 80)

            if isinstance(data, dict):
                for key, value in data.items():
                    print(f"  {key:30} {value}")
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        status_icon = "✓" if item.get("status") == "PASS" else "✗"
                        print(f"  {status_icon} {item.get('endpoint', item.get('name', 'Unknown'))}")
                        print(f"      Avg: {item.get('avg_time_ms', 'N/A')}ms "
                              f"(Target: {item.get('target_ms', 'N/A')}ms)")

        print("\n" + "=" * 80 + "\n")

    async def run_all_benchmarks(self, iterations: int = 50):
        """Run all performance benchmarks"""
        await self.setup()

        try:
            # Dashboard benchmarks
            dashboard_results = await self.benchmark_dashboard_kpis(iterations)
            self.results["Dashboard KPIs"] = dashboard_results

            # Expenses benchmarks
            expenses_results = await self.benchmark_expenses_list(iterations)
            self.results["Expenses List"] = expenses_results

            # Cache benchmarks
            cache_results = await self.benchmark_cache_performance(min(iterations * 10, 1000))
            self.results["Cache Performance"] = cache_results

            # Connection pool status
            pool_results = await self.benchmark_connection_pool()
            self.results["Connection Pool"] = pool_results

        finally:
            await self.cleanup()

        self.print_results()
        return self.results


async def main():
    """Main benchmark runner"""
    parser = argparse.ArgumentParser(description="Performance Benchmarking Tool")
    parser.add_argument(
        "--endpoint",
        choices=["dashboard", "expenses", "cache", "pool", "all"],
        default="all",
        help="Endpoint to benchmark"
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=50,
        help="Number of iterations per benchmark"
    )

    args = parser.parse_args()

    benchmark = PerformanceBenchmark()

    if args.endpoint == "all":
        await benchmark.run_all_benchmarks(args.iterations)
    else:
        await benchmark.setup()
        try:
            if args.endpoint == "dashboard":
                result = await benchmark.benchmark_dashboard_kpis(args.iterations)
                benchmark.results["Dashboard KPIs"] = result
            elif args.endpoint == "expenses":
                result = await benchmark.benchmark_expenses_list(args.iterations)
                benchmark.results["Expenses List"] = result
            elif args.endpoint == "cache":
                result = await benchmark.benchmark_cache_performance(args.iterations * 10)
                benchmark.results["Cache Performance"] = result
            elif args.endpoint == "pool":
                result = await benchmark.benchmark_connection_pool()
                benchmark.results["Connection Pool"] = result

            benchmark.print_results()
        finally:
            await benchmark.cleanup()


if __name__ == "__main__":
    asyncio.run(main())

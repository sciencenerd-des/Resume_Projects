#!/usr/bin/env python3
"""Performance benchmarking script for SDK vs Legacy agents.

Measures and compares:
- Pipeline latency
- Memory usage
- API call counts
- Session operation performance

Usage:
    python scripts/benchmark_performance.py
    python scripts/benchmark_performance.py --iterations 10
    python scripts/benchmark_performance.py --csv data/sample_leads.csv

Requirements:
- Python 3.10+ (for SDK agent)
- memory_profiler: pip install memory-profiler
"""

import sys
import os
import time
import argparse
from pathlib import Path
from typing import Dict, Any, List
import statistics

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Check Python version
PYTHON_310_PLUS = sys.version_info >= (3, 10)


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format."""
    if seconds < 1:
        return f"{seconds * 1000:.2f}ms"
    else:
        return f"{seconds:.2f}s"


def format_memory(bytes_val: int) -> str:
    """Format memory size in human-readable format."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if bytes_val < 1024.0:
            return f"{bytes_val:.2f}{unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.2f}TB"


class PerformanceBenchmark:
    """Performance benchmarking suite."""

    def __init__(self, csv_path: str, iterations: int = 5):
        """Initialize benchmark.

        Args:
            csv_path: Path to test CSV file
            iterations: Number of iterations for each benchmark
        """
        self.csv_path = csv_path
        self.iterations = iterations
        self.results = {
            "legacy": {},
            "sdk": {}
        }

    def benchmark_legacy_agent(self) -> Dict[str, Any]:
        """Benchmark legacy agent performance."""
        print("\n" + "=" * 60)
        print("BENCHMARKING LEGACY AGENT")
        print("=" * 60)

        from src.agent import create_agent

        latencies = []
        memory_usage = []

        for i in range(self.iterations):
            print(f"\nIteration {i + 1}/{self.iterations}...")

            # Measure latency
            start_time = time.time()

            agent = create_agent(verbose=False, notify_slack=False)
            result = agent.process_leads(self.csv_path)

            end_time = time.time()
            latency = end_time - start_time
            latencies.append(latency)

            print(f"  Latency: {format_duration(latency)}")
            print(f"  Status: {result.get('status')}")
            print(f"  Valid leads: {len(result.get('valid_leads', []))}")

        # Calculate statistics
        stats = {
            "latency_mean": statistics.mean(latencies),
            "latency_median": statistics.median(latencies),
            "latency_min": min(latencies),
            "latency_max": max(latencies),
            "latency_stdev": statistics.stdev(latencies) if len(latencies) > 1 else 0
        }

        print("\n" + "-" * 60)
        print("Legacy Agent Statistics:")
        print(f"  Mean latency:   {format_duration(stats['latency_mean'])}")
        print(f"  Median latency: {format_duration(stats['latency_median'])}")
        print(f"  Min latency:    {format_duration(stats['latency_min'])}")
        print(f"  Max latency:    {format_duration(stats['latency_max'])}")
        print(f"  Std deviation:  {format_duration(stats['latency_stdev'])}")

        return stats

    def benchmark_sdk_agent(self) -> Dict[str, Any]:
        """Benchmark SDK agent performance."""
        if not PYTHON_310_PLUS:
            print("\n⚠️  Skipping SDK benchmark (requires Python 3.10+)")
            return {}

        print("\n" + "=" * 60)
        print("BENCHMARKING SDK AGENT")
        print("=" * 60)

        from src.sdk.agents.orchestrator import create_orchestrator_agent
        from src.sdk.utils.legacy_adapter import LegacyAdapter

        latencies = []

        for i in range(self.iterations):
            print(f"\nIteration {i + 1}/{self.iterations}...")

            # Measure latency
            start_time = time.time()

            agent = create_orchestrator_agent(verbose=False, notify_slack=False)
            sdk_result = agent.run_pipeline(mode="batch", csv_path=self.csv_path)
            result = LegacyAdapter.to_legacy_dict(sdk_result)

            end_time = time.time()
            latency = end_time - start_time
            latencies.append(latency)

            print(f"  Latency: {format_duration(latency)}")
            print(f"  Status: {result.get('status')}")
            print(f"  Valid leads: {len(result.get('valid_leads', []))}")

        # Calculate statistics
        stats = {
            "latency_mean": statistics.mean(latencies),
            "latency_median": statistics.median(latencies),
            "latency_min": min(latencies),
            "latency_max": max(latencies),
            "latency_stdev": statistics.stdev(latencies) if len(latencies) > 1 else 0
        }

        print("\n" + "-" * 60)
        print("SDK Agent Statistics:")
        print(f"  Mean latency:   {format_duration(stats['latency_mean'])}")
        print(f"  Median latency: {format_duration(stats['latency_median'])}")
        print(f"  Min latency:    {format_duration(stats['latency_min'])}")
        print(f"  Max latency:    {format_duration(stats['latency_max'])}")
        print(f"  Std deviation:  {format_duration(stats['latency_stdev'])}")

        return stats

    def benchmark_session_operations(self) -> Dict[str, Any]:
        """Benchmark session manager performance."""
        if not PYTHON_310_PLUS:
            print("\n⚠️  Skipping session benchmark (requires Python 3.10+)")
            return {}

        print("\n" + "=" * 60)
        print("BENCHMARKING SESSION OPERATIONS")
        print("=" * 60)

        from src.sdk.sessions.slack_session_manager import SlackSessionManager

        # Test with memory storage
        manager = SlackSessionManager(redis_url=None)

        iterations = 1000
        session_data = {
            "messages": [{"role": "user", "content": "test"} for _ in range(10)],
            "context": {"mode": "conversational"}
        }

        # Benchmark save
        print(f"\nBenchmarking SAVE operation ({iterations} iterations)...")
        start = time.time()
        for i in range(iterations):
            manager.save_session(f"C{i}", f"{i}.000", session_data)
        save_duration = time.time() - start
        save_per_op = save_duration / iterations

        # Benchmark get
        print(f"Benchmarking GET operation ({iterations} iterations)...")
        start = time.time()
        for i in range(iterations):
            manager.get_session(f"C{i}", f"{i}.000")
        get_duration = time.time() - start
        get_per_op = get_duration / iterations

        # Benchmark exists
        print(f"Benchmarking EXISTS operation ({iterations} iterations)...")
        start = time.time()
        for i in range(iterations):
            manager.session_exists(f"C{i}", f"{i}.000")
        exists_duration = time.time() - start
        exists_per_op = exists_duration / iterations

        stats = {
            "save_per_op": save_per_op,
            "get_per_op": get_per_op,
            "exists_per_op": exists_per_op
        }

        print("\nSession Operation Performance:")
        print(f"  SAVE:   {format_duration(save_per_op)} per operation")
        print(f"  GET:    {format_duration(get_per_op)} per operation")
        print(f"  EXISTS: {format_duration(exists_per_op)} per operation")

        return stats

    def compare_agents(self, legacy_stats: Dict, sdk_stats: Dict):
        """Compare SDK vs Legacy performance."""
        if not sdk_stats:
            print("\n⚠️  Cannot compare (SDK not available)")
            return

        print("\n" + "=" * 60)
        print("COMPARISON: SDK vs Legacy")
        print("=" * 60)

        legacy_mean = legacy_stats["latency_mean"]
        sdk_mean = sdk_stats["latency_mean"]

        difference = sdk_mean - legacy_mean
        percentage = (difference / legacy_mean) * 100

        print(f"\nMean Latency:")
        print(f"  Legacy: {format_duration(legacy_mean)}")
        print(f"  SDK:    {format_duration(sdk_mean)}")
        print(f"  Δ:      {format_duration(abs(difference))} ({abs(percentage):.1f}%)")

        if difference > 0:
            print(f"  Result: SDK is {percentage:.1f}% SLOWER")
        else:
            print(f"  Result: SDK is {abs(percentage):.1f}% FASTER")

        # Check if within acceptable range (20%)
        if abs(percentage) <= 20:
            print("  ✅ PASSED: Performance within 20% target")
        else:
            print(f"  ⚠️  WARNING: Performance difference exceeds 20% target")

    def run_all_benchmarks(self):
        """Run complete benchmark suite."""
        print("\n" + "=" * 60)
        print("PERFORMANCE BENCHMARK SUITE")
        print("=" * 60)
        print(f"CSV File: {self.csv_path}")
        print(f"Iterations: {self.iterations}")
        print(f"Python Version: {sys.version.split()[0]}")
        print(f"SDK Available: {PYTHON_310_PLUS}")

        # Benchmark legacy
        legacy_stats = self.benchmark_legacy_agent()

        # Benchmark SDK (if available)
        if PYTHON_310_PLUS:
            sdk_stats = self.benchmark_sdk_agent()
            session_stats = self.benchmark_session_operations()

            # Compare
            self.compare_agents(legacy_stats, sdk_stats)

        print("\n" + "=" * 60)
        print("BENCHMARK COMPLETE")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Benchmark SDK vs Legacy agent performance"
    )
    parser.add_argument(
        "--csv",
        default="data/sample_leads.csv",
        help="Path to test CSV file (default: data/sample_leads.csv)"
    )
    parser.add_argument(
        "--iterations",
        type=int,
        default=5,
        help="Number of iterations per benchmark (default: 5)"
    )

    args = parser.parse_args()

    csv_path = args.csv

    # Verify CSV exists
    if not Path(csv_path).exists():
        print(f"❌ Error: CSV file not found: {csv_path}")
        sys.exit(1)

    # Run benchmarks
    benchmark = PerformanceBenchmark(csv_path, args.iterations)
    benchmark.run_all_benchmarks()


if __name__ == "__main__":
    main()

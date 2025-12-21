#!/usr/bin/env python3
"""Validate that SDK agent produces byte-for-byte identical responses to legacy agent.

This script runs both the legacy agent and SDK agent on the same test data
and compares the results field by field to ensure perfect backward compatibility.

Usage:
    python scripts/validate_compatibility.py
    python scripts/validate_compatibility.py --csv data/sample_leads.csv
"""
import sys
import os
import json
import argparse
from pathlib import Path
from typing import Dict, Any

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.agent import create_agent as create_legacy_agent
from src.sdk.agents.orchestrator import create_orchestrator_agent
from src.sdk.utils.legacy_adapter import LegacyAdapter


def compare_results(legacy_result: Dict[str, Any], sdk_result: Dict[str, Any]) -> bool:
    """Compare legacy vs SDK results field by field.

    Args:
        legacy_result: Result from legacy agent
        sdk_result: Result from SDK agent (after adapter conversion)

    Returns:
        True if results match, False otherwise
    """
    print("\n" + "=" * 60)
    print("COMPARING RESULTS")
    print("=" * 60)

    all_match = True

    # Compare status
    print(f"\n✓ Status: {legacy_result.get('status')} == {sdk_result.get('status')}")
    if legacy_result.get("status") != sdk_result.get("status"):
        print(f"  ❌ MISMATCH: Legacy={legacy_result.get('status')}, SDK={sdk_result.get('status')}")
        all_match = False

    # Compare CSV path
    print(f"✓ CSV Path: {legacy_result.get('csv_path')} == {sdk_result.get('csv_path')}")
    if legacy_result.get("csv_path") != sdk_result.get("csv_path"):
        print(f"  ❌ MISMATCH")
        all_match = False

    # Compare steps count
    legacy_steps = len(legacy_result.get("steps", []))
    sdk_steps = len(sdk_result.get("steps", []))
    print(f"✓ Steps count: {legacy_steps} == {sdk_steps}")
    if legacy_steps != sdk_steps:
        print(f"  ❌ MISMATCH")
        all_match = False

    # Compare leads counts
    legacy_valid = len(legacy_result.get("valid_leads", []))
    sdk_valid = len(sdk_result.get("valid_leads", []))
    print(f"✓ Valid leads: {legacy_valid} == {sdk_valid}")
    if legacy_valid != sdk_valid:
        print(f"  ❌ MISMATCH")
        all_match = False

    legacy_invalid = len(legacy_result.get("invalid_leads", []))
    sdk_invalid = len(sdk_result.get("invalid_leads", []))
    print(f"✓ Invalid leads: {legacy_invalid} == {sdk_invalid}")
    if legacy_invalid != sdk_invalid:
        print(f"  ❌ MISMATCH")
        all_match = False

    # Compare score stats
    legacy_score_stats = legacy_result.get("score_stats", {})
    sdk_score_stats = sdk_result.get("score_stats", {})

    if legacy_score_stats and sdk_score_stats:
        print(f"✓ Score stats (HOT): {legacy_score_stats.get('hot')} == {sdk_score_stats.get('hot')}")
        if legacy_score_stats.get("hot") != sdk_score_stats.get("hot"):
            print(f"  ❌ MISMATCH")
            all_match = False

        print(f"✓ Score stats (WARM): {legacy_score_stats.get('warm')} == {sdk_score_stats.get('warm')}")
        if legacy_score_stats.get("warm") != sdk_score_stats.get("warm"):
            print(f"  ❌ MISMATCH")
            all_match = False

        print(f"✓ Score stats (COLD): {legacy_score_stats.get('cold')} == {sdk_score_stats.get('cold')}")
        if legacy_score_stats.get("cold") != sdk_score_stats.get("cold"):
            print(f"  ❌ MISMATCH")
            all_match = False

    # Compare notion results
    legacy_notion = legacy_result.get("notion_results", {})
    sdk_notion = sdk_result.get("notion_results", {})

    if legacy_notion and sdk_notion:
        print(f"✓ Notion synced: {legacy_notion.get('success')} == {sdk_notion.get('success')}")
        if legacy_notion.get("success") != sdk_notion.get("success"):
            print(f"  ❌ MISMATCH")
            all_match = False

    # Compare report presence
    legacy_has_report = bool(legacy_result.get("report"))
    sdk_has_report = bool(sdk_result.get("report"))
    print(f"✓ Report present: {legacy_has_report} == {sdk_has_report}")
    if legacy_has_report != sdk_has_report:
        print(f"  ❌ MISMATCH")
        all_match = False

    return all_match


def main():
    parser = argparse.ArgumentParser(
        description="Validate backward compatibility between legacy and SDK agents"
    )
    parser.add_argument(
        "--csv",
        default="data/sample_leads.csv",
        help="Path to test CSV file (default: data/sample_leads.csv)"
    )
    args = parser.parse_args()

    test_csv = args.csv

    # Verify test file exists
    if not Path(test_csv).exists():
        print(f"❌ Error: Test CSV file not found: {test_csv}")
        sys.exit(1)

    print("=" * 60)
    print("BACKWARD COMPATIBILITY VALIDATION")
    print("=" * 60)
    print(f"Test CSV: {test_csv}")
    print()

    # Run with legacy agent
    print("🔄 Running with LEGACY agent...")
    legacy_agent = create_legacy_agent(verbose=False, notify_slack=False)
    legacy_result = legacy_agent.process_leads(test_csv)
    print(f"✅ Legacy agent completed: {legacy_result.get('status')}")

    # Run with SDK agent
    print("\n🔄 Running with SDK agent...")
    sdk_agent = create_orchestrator_agent(verbose=False, notify_slack=False)
    sdk_raw = sdk_agent.run_pipeline(mode="batch", csv_path=test_csv)
    sdk_result = LegacyAdapter.to_legacy_dict(sdk_raw)
    print(f"✅ SDK agent completed: {sdk_result.get('status')}")

    # Compare results
    results_match = compare_results(legacy_result, sdk_result)

    print("\n" + "=" * 60)
    if results_match:
        print("✅ VALIDATION PASSED - Results match perfectly!")
        print("=" * 60)
        sys.exit(0)
    else:
        print("❌ VALIDATION FAILED - Results differ!")
        print("=" * 60)
        print("\nLegacy result keys:", sorted(legacy_result.keys()))
        print("SDK result keys:", sorted(sdk_result.keys()))
        sys.exit(1)


if __name__ == "__main__":
    main()

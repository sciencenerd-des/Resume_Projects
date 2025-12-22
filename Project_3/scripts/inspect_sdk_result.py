#!/usr/bin/env python3
"""Inspect the actual SDK agent result structure.

This script runs the SDK orchestrator agent and prints out the detailed
structure of what it returns, so we can implement proper result parsing.
"""
import sys
import os
from pathlib import Path
import json
from pprint import pprint

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Suppress verbose output
os.environ["DEBUG"] = "false"
os.environ["DISABLE_SLACK"] = "true"

from src.sdk.agents.orchestrator import create_orchestrator_agent


def inspect_result_structure(result):
    """Recursively inspect and print result structure."""
    print("\n" + "=" * 60)
    print("SDK AGENT RESULT STRUCTURE")
    print("=" * 60)

    print(f"\nType: {type(result)}")
    print(f"\nString representation:\n{result}")

    if hasattr(result, '__dict__'):
        print(f"\nObject attributes: {dir(result)}")
        print(f"\nObject __dict__:")
        pprint(vars(result))

    # Check for common attributes
    if hasattr(result, 'messages'):
        print(f"\n--- Messages ({len(result.messages)} total) ---")
        for i, msg in enumerate(result.messages[:3]):  # Show first 3
            print(f"\nMessage {i}:")
            print(f"  Type: {type(msg)}")
            if hasattr(msg, '__dict__'):
                pprint(vars(msg))

    if hasattr(result, 'context'):
        print(f"\n--- Context ---")
        pprint(result.context)

    if hasattr(result, 'final_output'):
        print(f"\n--- Final Output ---")
        print(result.final_output)

    if hasattr(result, 'tool_calls'):
        print(f"\n--- Tool Calls ---")
        pprint(result.tool_calls)


def main():
    print("Creating SDK Orchestrator Agent...")
    agent = create_orchestrator_agent(verbose=False, notify_slack=False)

    print("\n✓ Agent created successfully!")
    print(f"Agent type: {type(agent)}")
    print(f"Agent has run_pipeline: {hasattr(agent, 'run_pipeline')}")
    print(f"Agent.agent type: {type(agent.agent)}")

    # Try to run a simple test
    test_csv = "data/sample_leads.csv"

    if not Path(test_csv).exists():
        print(f"\n❌ Test CSV not found: {test_csv}")
        print("Create a minimal test CSV or adjust the path")
        return

    print(f"\nRunning pipeline with: {test_csv}")
    print("-" * 60)

    try:
        result = agent.run_pipeline(mode="batch", csv_path=test_csv)

        print("\n✅ Pipeline completed!")
        print(f"\nResult type: {type(result)}")
        print(f"\nResult keys: {result.keys() if isinstance(result, dict) else 'Not a dict'}")

        if isinstance(result, dict):
            print(f"\nResult structure:")
            pprint(result)

        # Inspect the raw agent result
        if "result" in result:
            print("\n" + "=" * 60)
            print("INNER RESULT INSPECTION")
            print("=" * 60)
            inspect_result_structure(result["result"])

    except Exception as e:
        print(f"\n❌ Error running pipeline: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()

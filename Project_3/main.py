#!/usr/bin/env python3
"""Lead Processing Agent CLI.

Usage:
    python main.py <path_to_csv>
    python main.py data/sample_leads.csv
    python main.py data/sample_leads.csv --no-slack
"""
import sys
import argparse
from pathlib import Path

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from src.agent import create_agent


def main():
    parser = argparse.ArgumentParser(
        description="Lead Processing Agent - Process CSV leads through validation, CRM sync, and reporting",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python main.py data/sample_leads.csv
    python main.py leads.csv --no-slack
    python main.py data/sample_leads.csv --quiet
        """
    )
    
    parser.add_argument(
        "csv_file",
        help="Path to the CSV file containing leads"
    )
    
    parser.add_argument(
        "--no-slack",
        action="store_true",
        help="Disable Slack notifications"
    )
    
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Disable verbose output"
    )
    
    args = parser.parse_args()
    
    # Validate file exists
    csv_path = Path(args.csv_file)
    if not csv_path.exists():
        print(f"❌ Error: File not found: {args.csv_file}")
        sys.exit(1)
    
    # Banner
    if not args.quiet:
        print("""
╔══════════════════════════════════════════════════════════╗
║           🚀 LEAD PROCESSING AGENT                       ║
║           Powered by OpenAI + Notion + Slack             ║
╚══════════════════════════════════════════════════════════╝
""")
        print(f"📁 Input file: {csv_path.absolute()}\n")
    
    # Create and run agent
    agent = create_agent(
        verbose=not args.quiet,
        notify_slack=not args.no_slack
    )
    
    results = agent.process_leads(str(csv_path))
    
    # Print report
    if results.get("report"):
        print(results["report"])
    
    # Exit with appropriate code
    if results["status"] == "complete":
        sys.exit(0)
    else:
        print(f"\n❌ Processing failed: {results.get('error', 'Unknown error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()

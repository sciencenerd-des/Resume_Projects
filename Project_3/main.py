#!/usr/bin/env python3
"""Lead Processing Agent CLI.

Usage:
    python main.py <path_to_csv>
    python main.py data/sample_leads.csv
    python main.py data/sample_leads.csv --no-slack
    python main.py data/sample_leads.csv --export-csv output.csv
"""
import sys
import os
import argparse
from pathlib import Path

# Add project root to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from src.agent import create_agent


def main():
    parser = argparse.ArgumentParser(
        description="Lead Processing Agent - Process CSV leads through validation, scoring, CRM sync, and reporting",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python main.py data/sample_leads.csv
    python main.py leads.csv --no-slack
    python main.py data/sample_leads.csv --quiet
    python main.py data/sample_leads.csv --export-csv processed.csv
    python main.py data/sample_leads.csv --enable-ai
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
    
    parser.add_argument(
        "--enable-ai",
        action="store_true",
        help="Enable AI analysis for hot leads (requires OPENAI_API_KEY)"
    )
    
    parser.add_argument(
        "--export-csv",
        metavar="PATH",
        help="Export scored leads to CSV file"
    )
    
    parser.add_argument(
        "--export-pdf",
        metavar="PATH",
        help="Export report to PDF file (requires reportlab)"
    )
    
    args = parser.parse_args()
    
    # Set AI analysis flag via environment variable
    if args.enable_ai:
        os.environ["ENABLE_AI_ANALYSIS"] = "true"
    
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
    
    # Handle exports
    if results.get("scored_leads"):
        if args.export_csv:
            from src.tools.exporter import export_to_csv
            try:
                path = export_to_csv(results["scored_leads"], args.export_csv)
                print(f"\n📄 Exported to CSV: {path}")
            except Exception as e:
                print(f"\n❌ CSV export failed: {e}")
        
        if args.export_pdf:
            from src.tools.exporter import export_to_pdf
            try:
                path = export_to_pdf(
                    results["scored_leads"],
                    args.export_pdf,
                    score_stats=results.get("score_stats")
                )
                if path.startswith("PDF export requires"):
                    print(f"\n⚠️ {path}")
                else:
                    print(f"\n📑 Exported to PDF: {path}")
            except Exception as e:
                print(f"\n❌ PDF export failed: {e}")
    
    # Exit with appropriate code
    if results["status"] == "complete":
        sys.exit(0)
    else:
        print(f"\n❌ Processing failed: {results.get('error', 'Unknown error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()


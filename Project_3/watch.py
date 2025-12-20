#!/usr/bin/env python3
"""File watcher for automatic lead processing.

Watch a folder for new CSV files and process them automatically.

Usage:
    python watch.py ./inbox
    python watch.py ./inbox --processed ./processed
"""
import time
import sys
import argparse
from pathlib import Path

try:
    from watchdog.observers import Observer
    from watchdog.events import FileSystemEventHandler
except ImportError:
    print("Error: watchdog not installed. Run: pip install watchdog")
    sys.exit(1)

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))
from src.agent import create_agent


class CSVHandler(FileSystemEventHandler):
    """Handle new CSV file events."""
    
    def __init__(self, agent, move_to=None, verbose=True):
        self.agent = agent
        self.move_to = Path(move_to) if move_to else None
        self.verbose = verbose
        self.processed_files = set()
    
    def on_created(self, event):
        """Handle new file creation."""
        if event.is_directory:
            return
        
        if not event.src_path.endswith('.csv'):
            return
        
        # Avoid processing the same file twice (watchdog can fire multiple times)
        if event.src_path in self.processed_files:
            return
        
        self.processed_files.add(event.src_path)
        
        # Wait a moment for file to be fully written
        time.sleep(0.5)
        
        if self.verbose:
            print(f"\n{'='*60}")
            print(f"📁 New CSV detected: {event.src_path}")
            print(f"{'='*60}")
        
        try:
            results = self.agent.process_leads(event.src_path)
            
            if results.get("report"):
                print(results["report"])
            
            # Move processed file if destination specified
            if self.move_to and results.get("status") == "complete":
                src = Path(event.src_path)
                dest = self.move_to / src.name
                
                # Handle name conflicts
                if dest.exists():
                    timestamp = time.strftime("%Y%m%d_%H%M%S")
                    dest = self.move_to / f"{src.stem}_{timestamp}{src.suffix}"
                
                src.rename(dest)
                if self.verbose:
                    print(f"\n📦 Moved to: {dest}")
                    
        except Exception as e:
            print(f"\n❌ Error processing {event.src_path}: {e}")


def main():
    parser = argparse.ArgumentParser(
        description="Watch folder for CSV files and process them automatically",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python watch.py ./inbox
    python watch.py ./inbox --processed ./done
    python watch.py data/incoming --no-slack
        """
    )
    
    parser.add_argument(
        "folder",
        help="Folder to watch for new CSV files"
    )
    
    parser.add_argument(
        "--processed",
        metavar="DIR",
        help="Move processed files to this directory"
    )
    
    parser.add_argument(
        "--no-slack",
        action="store_true",
        help="Disable Slack notifications"
    )
    
    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Minimal output"
    )
    
    args = parser.parse_args()
    
    # Validate watch folder
    watch_folder = Path(args.folder)
    if not watch_folder.exists():
        print(f"Creating watch folder: {watch_folder}")
        watch_folder.mkdir(parents=True)
    
    # Create processed folder if specified
    if args.processed:
        processed_folder = Path(args.processed)
        if not processed_folder.exists():
            print(f"Creating processed folder: {processed_folder}")
            processed_folder.mkdir(parents=True)
    
    # Create agent
    agent = create_agent(
        verbose=not args.quiet,
        notify_slack=not args.no_slack
    )
    
    # Set up file watcher
    handler = CSVHandler(
        agent=agent,
        move_to=args.processed,
        verbose=not args.quiet
    )
    
    observer = Observer()
    observer.schedule(handler, str(watch_folder), recursive=False)
    observer.start()
    
    if not args.quiet:
        print(f"""
╔══════════════════════════════════════════════════════════╗
║           👀 FILE WATCHER ACTIVE                         ║
╠══════════════════════════════════════════════════════════╣
║  Watching: {str(watch_folder):<46} ║
║  Processed: {str(args.processed or 'Not moving'):<45} ║
║  Slack: {'Enabled' if not args.no_slack else 'Disabled':<49} ║
╠══════════════════════════════════════════════════════════╣
║  Press Ctrl+C to stop                                    ║
╚══════════════════════════════════════════════════════════╝
""")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
        if not args.quiet:
            print("\n\n👋 File watcher stopped.")
    
    observer.join()


if __name__ == "__main__":
    main()

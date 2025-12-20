"""Lead Processing Agent - Main Agent Definition.

Orchestrates the lead processing pipeline using OpenAI.
"""
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

from src.tools.csv_ingest import ingest_csv, get_csv_summary
from src.tools.email_validator import validate_leads
from src.tools.notion_crm import add_leads_batch
from src.tools.report_generator import generate_report
from src.tools.slack_notify import send_lead_report_notification
from src.tools.lead_scorer import LeadScorer
from src.tools.ai_analyzer import AILeadAnalyzer

# Load environment variables
load_dotenv()


class LeadProcessorAgent:
    """
    AI-powered Lead Processing Agent.
    
    Processes CSV leads through validation, CRM sync, and reporting.
    """
    
    def __init__(self, verbose: bool = True, notify_slack: bool = True):
        """
        Initialize the Lead Processor Agent.
        
        Args:
            verbose: Print progress messages
            notify_slack: Send Slack notifications on completion
        """
        self.verbose = verbose
        self.notify_slack = notify_slack
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.enable_ai = os.getenv("ENABLE_AI_ANALYSIS", "false").lower() == "true"
    
    def log(self, message: str):
        """Print message if verbose mode is enabled."""
        if self.verbose:
            print(message)
    
    def process_leads(self, csv_path: str) -> Dict[str, Any]:
        """
        Process leads from a CSV file through the full pipeline.
        
        Pipeline:
        1. Ingest CSV → Extract leads
        2. Validate → Filter by email format
        3. Score Leads → Assign HOT/WARM/COLD categories
        4. AI Analyze → Classify hot leads (optional)
        5. Sync to Notion → Add scored leads to CRM
        6. Report → Generate summary
        7. Notify → Send Slack notification
        
        Args:
            csv_path: Path to the CSV file containing leads
            
        Returns:
            Dict with processing results and report
        """
        results = {
            "status": "pending",
            "csv_path": csv_path,
            "steps": []
        }
        
        try:
            # Step 1: Ingest CSV
            self.log("📥 Step 1: Ingesting CSV file...")
            leads = ingest_csv(csv_path)
            summary = get_csv_summary(leads)
            results["steps"].append({
                "step": "ingest",
                "status": "success",
                "count": summary["count"],
                "fields": summary["fields"]
            })
            self.log(f"   Found {summary['count']} leads with fields: {summary['fields']}")
            
            # Step 2: Validate Emails
            self.log("✅ Step 2: Validating email addresses...")
            validation = validate_leads(leads, email_field="email")
            results["steps"].append({
                "step": "validate",
                "status": "success",
                "valid": validation["valid_count"],
                "invalid": validation["invalid_count"]
            })
            results["valid_leads"] = validation["valid_leads"]
            results["invalid_leads"] = validation["invalid_leads"]
            results["validation_errors"] = validation["errors"]
            self.log(f"   Valid: {validation['valid_count']}, Invalid: {validation['invalid_count']}")
            
            # Step 3: Score Valid Leads
            self.log("📊 Step 3: Scoring valid leads...")
            scorer = LeadScorer()
            scored_leads = scorer.score_leads_batch(validation["valid_leads"])
            score_stats = scorer.get_summary_stats(scored_leads)
            results["steps"].append({
                "step": "scoring",
                "status": "success",
                "hot": score_stats["hot"],
                "warm": score_stats["warm"],
                "cold": score_stats["cold"]
            })
            results["scored_leads"] = scored_leads
            results["score_stats"] = score_stats
            self.log(f"   🔥 HOT: {score_stats['hot']}, 🌡️ WARM: {score_stats['warm']}, ❄️ COLD: {score_stats['cold']}")
            
            # Step 4: AI Analysis (for hot leads only, if enabled)
            ai_analyzed_count = 0
            if self.enable_ai:
                hot_leads = [l for l in scored_leads if l.get("score_category") == "hot"]
                if hot_leads:
                    self.log(f"🤖 Step 4: AI analyzing {len(hot_leads)} hot leads...")
                    analyzer = AILeadAnalyzer()
                    if analyzer.is_available():
                        analyzed = analyzer.classify_leads_batch(hot_leads)
                        # Merge AI analysis back into scored_leads
                        analyzed_emails = {l["email"]: l.get("ai_analysis") for l in analyzed}
                        for lead in scored_leads:
                            if lead["email"] in analyzed_emails:
                                lead["ai_analysis"] = analyzed_emails[lead["email"]]
                        ai_analyzed_count = len(hot_leads)
                        results["steps"].append({"step": "ai_analysis", "status": "success", "analyzed": ai_analyzed_count})
                        self.log(f"   Analyzed {ai_analyzed_count} leads with AI")
                    else:
                        results["steps"].append({"step": "ai_analysis", "status": "skipped", "reason": "OpenAI not configured"})
                        self.log("   AI analysis skipped (OpenAI not configured)")
            
            # Step 5: Sync to Notion CRM
            self.log("📝 Step 5: Syncing scored leads to Notion CRM...")
            notion_results = add_leads_batch(scored_leads)
            results["steps"].append({
                "step": "notion_sync",
                "status": "success" if notion_results["errors"] == 0 else "partial",
                "synced": notion_results["success"],
                "errors": notion_results["errors"]
            })
            results["notion_results"] = notion_results
            self.log(f"   Synced: {notion_results['success']}, Errors: {notion_results['errors']}")
            
            # Step 6: Generate Report
            self.log("📋 Step 6: Generating report...")
            report = generate_report(
                valid_count=validation["valid_count"],
                invalid_count=validation["invalid_count"],
                errors=validation["errors"],
                notion_results=notion_results,
                score_stats=score_stats,
                ai_analyzed=ai_analyzed_count
            )
            results["report"] = report
            results["steps"].append({"step": "report", "status": "success"})
            
            # Step 7: Slack Notification
            if self.notify_slack:
                self.log("🔔 Step 7: Sending Slack notification...")
                slack_result = send_lead_report_notification(
                    valid_count=validation["valid_count"],
                    invalid_count=validation["invalid_count"],
                    notion_synced=notion_results["success"],
                    errors=validation["errors"]
                )
                results["steps"].append({
                    "step": "slack_notify",
                    "status": slack_result.get("status", "unknown")
                })
                self.log(f"   Notification: {slack_result.get('status', 'sent')}")
            
            results["status"] = "complete"
            self.log("\n✨ Processing complete!")
            
        except FileNotFoundError as e:
            results["status"] = "error"
            results["error"] = f"File not found: {e}"
            self.log(f"❌ Error: {e}")
            
        except ValueError as e:
            results["status"] = "error"
            results["error"] = f"Invalid data: {e}"
            self.log(f"❌ Error: {e}")
            
        except Exception as e:
            results["status"] = "error"
            results["error"] = str(e)
            self.log(f"❌ Unexpected error: {e}")
        
        return results


def create_agent(verbose: bool = True, notify_slack: bool = True) -> LeadProcessorAgent:
    """
    Factory function to create a Lead Processor Agent.
    
    Args:
        verbose: Enable progress logging
        notify_slack: Enable Slack notifications
        
    Returns:
        Configured LeadProcessorAgent instance
    """
    return LeadProcessorAgent(verbose=verbose, notify_slack=notify_slack)


# OpenAI Integration (for future AI-enhanced processing)
def get_openai_client():
    """Get OpenAI client if configured."""
    try:
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            return OpenAI(api_key=api_key)
    except ImportError:
        pass
    return None

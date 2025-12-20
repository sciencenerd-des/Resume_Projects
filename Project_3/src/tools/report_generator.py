"""Report Generator Tool for Lead Processing Agent.

Generates formatted summary reports of lead processing runs.
"""
from typing import List, Dict, Any
from datetime import datetime


def generate_report(
    valid_count: int,
    invalid_count: int,
    errors: List[str] = None,
    notion_results: Dict[str, Any] = None,
    score_stats: Dict[str, Any] = None,
    ai_analyzed: int = 0
) -> str:
    """
    Generate a summary report of the lead processing run.
    
    Args:
        valid_count: Count of successfully processed leads
        invalid_count: Count of rejected leads
        errors: List of error messages
        notion_results: Results from Notion batch operation
        score_stats: Lead scoring statistics (categories, avg_score)
        ai_analyzed: Number of leads analyzed with AI
        
    Returns:
        Formatted report string
    """
    errors = errors or []
    total = valid_count + invalid_count
    success_rate = (valid_count / total * 100) if total > 0 else 0
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    report_lines = [
        "",
        "╔══════════════════════════════════════════════════════════╗",
        "║           LEAD PROCESSING REPORT                         ║",
        "╠══════════════════════════════════════════════════════════╣",
        f"║  Timestamp:      {timestamp:<40} ║",
        "╠══════════════════════════════════════════════════════════╣",
        f"║  Total Processed:    {total:>5}                               ║",
        f"║  Valid Leads:        {valid_count:>5}  ✅                          ║",
        f"║  Invalid Leads:      {invalid_count:>5}  ❌                          ║",
        f"║  Success Rate:       {success_rate:>5.1f}%                           ║",
    ]
    
    # Add scoring categories section if available
    if score_stats:
        hot = score_stats.get("hot", 0)
        warm = score_stats.get("warm", 0)
        cold = score_stats.get("cold", 0)
        avg_score = score_stats.get("avg_score", 0)
        report_lines.extend([
            "╠══════════════════════════════════════════════════════════╣",
            "║  Lead Categories:                                        ║",
            f"║    🔥 HOT:           {hot:>3}                                  ║",
            f"║    🌡️  WARM:          {warm:>3}                                  ║",
            f"║    ❄️  COLD:          {cold:>3}                                  ║",
            f"║  Avg Score:        {avg_score:>5.1f}                              ║",
        ])
        if ai_analyzed > 0:
            report_lines.append(f"║  AI Analyzed:        {ai_analyzed:>3}  🤖                           ║")
    
    # Add Notion sync info if available
    if notion_results:
        synced = notion_results.get("success", 0)
        sync_errors = notion_results.get("errors", 0)
        report_lines.extend([
            "╠══════════════════════════════════════════════════════════╣",
            f"║  Synced to Notion:   {synced:>5}  📝                          ║",
            f"║  Sync Errors:        {sync_errors:>5}                               ║",
        ])
    
    report_lines.append("╚══════════════════════════════════════════════════════════╝")
    
    # Add errors section if any
    if errors:
        report_lines.append("")
        report_lines.append("Validation Errors:")
        for error in errors[:10]:  # Limit to 10 errors
            report_lines.append(f"  • {error}")
        if len(errors) > 10:
            report_lines.append(f"  ... and {len(errors) - 10} more errors")
    
    return "\n".join(report_lines)


def generate_email_report(
    valid_count: int,
    invalid_count: int,
    errors: List[str] = None
) -> Dict[str, str]:
    """
    Generate an email-friendly report (subject and body).
    
    Args:
        valid_count: Count of successfully processed leads
        invalid_count: Count of rejected leads
        errors: List of error messages
        
    Returns:
        Dict with 'subject' and 'body' keys
    """
    total = valid_count + invalid_count
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    subject = f"Lead Processing Complete: {valid_count} leads added, {invalid_count} rejected"
    
    body_lines = [
        f"Lead Processing Report - {timestamp}",
        "",
        f"Total Processed: {total}",
        f"✅ Valid Leads: {valid_count}",
        f"❌ Invalid Leads: {invalid_count}",
    ]
    
    if errors:
        body_lines.append("")
        body_lines.append("Errors:")
        for error in errors[:5]:
            body_lines.append(f"- {error}")
    
    return {
        "subject": subject,
        "body": "\n".join(body_lines)
    }

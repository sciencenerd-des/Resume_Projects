"""Export module for processed leads.

Provides CSV and PDF export capabilities for lead processing results.
"""
import csv
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional


def export_to_csv(
    leads: List[Dict[str, Any]],
    output_path: Optional[str] = None,
    include_scoring: bool = True
) -> str:
    """
    Export leads to CSV file.
    
    Args:
        leads: List of lead dictionaries
        output_path: Output file path (auto-generated if not provided)
        include_scoring: Include score fields in export
        
    Returns:
        Path to exported file
    """
    if not leads:
        raise ValueError("No leads to export")
    
    if not output_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"processed_leads_{timestamp}.csv"
    
    # Determine fields to export
    base_fields = ["name", "email", "company", "tags"]
    score_fields = ["score", "score_category", "normalized_score"]
    
    # Get all available fields from leads
    all_fields = set()
    for lead in leads:
        all_fields.update(lead.keys())
    
    # Order fields logically
    fieldnames = []
    for field in base_fields + score_fields:
        if field in all_fields:
            fieldnames.append(field)
    
    # Add any remaining fields (excluding None and internal fields)
    remaining = all_fields - set(fieldnames)
    for field in sorted([f for f in remaining if f and not str(f).startswith("_") and f != "ai_analysis"]):
            fieldnames.append(field)
    
    # Write CSV
    with open(output_path, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(leads)
    
    return output_path


def export_to_pdf(
    leads: List[Dict[str, Any]],
    output_path: Optional[str] = None,
    title: str = "Lead Processing Report",
    score_stats: Optional[Dict[str, Any]] = None
) -> str:
    """
    Export leads report to PDF.
    
    Requires reportlab: pip install reportlab
    
    Args:
        leads: List of lead dictionaries
        output_path: Output file path (auto-generated if not provided)
        title: Report title
        score_stats: Optional scoring statistics
        
    Returns:
        Path to exported file, or error message if reportlab not installed
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
    except ImportError:
        return "PDF export requires reportlab: pip install reportlab"
    
    if not leads:
        raise ValueError("No leads to export")
    
    if not output_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"leads_report_{timestamp}.pdf"
    
    # Create PDF
    doc = SimpleDocTemplate(output_path, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    elements.append(Paragraph(title, styles['Heading1']))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Summary section
    if score_stats:
        summary_data = [
            ["Metric", "Value"],
            ["Total Leads", str(len(leads))],
            ["🔥 HOT", str(score_stats.get("hot", 0))],
            ["🌡️ WARM", str(score_stats.get("warm", 0))],
            ["❄️ COLD", str(score_stats.get("cold", 0))],
            ["Avg Score", f"{score_stats.get('avg_score', 0):.1f}"],
        ]
        summary_table = Table(summary_data, colWidths=[150, 100])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ]))
        elements.append(Paragraph("Summary", styles['Heading2']))
        elements.append(summary_table)
        elements.append(Spacer(1, 20))
    
    # Leads table (first 50)
    elements.append(Paragraph("Lead Details", styles['Heading2']))
    
    table_data = [["#", "Name", "Email", "Company", "Category", "Score"]]
    for i, lead in enumerate(leads[:50], 1):
        table_data.append([
            str(i),
            lead.get("name", "N/A")[:20],
            lead.get("email", "N/A")[:25],
            lead.get("company", "N/A")[:15],
            lead.get("score_category", "N/A").upper(),
            str(lead.get("score", "N/A"))
        ])
    
    if len(leads) > 50:
        table_data.append(["...", f"+ {len(leads) - 50} more", "", "", "", ""])
    
    leads_table = Table(table_data, colWidths=[30, 100, 130, 80, 60, 40])
    leads_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
    ]))
    elements.append(leads_table)
    
    # Build PDF
    doc.build(elements)
    return output_path


def generate_summary_text(
    results: Dict[str, Any],
    include_leads: bool = False
) -> str:
    """
    Generate a text summary of processing results.
    
    Args:
        results: Processing results from agent
        include_leads: Include individual lead details
        
    Returns:
        Formatted text summary
    """
    lines = [
        "=" * 60,
        "LEAD PROCESSING SUMMARY",
        "=" * 60,
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
    ]
    
    # Validation summary
    lines.append(f"Total Leads: {len(results.get('valid_leads', [])) + len(results.get('invalid_leads', []))}")
    lines.append(f"Valid: {len(results.get('valid_leads', []))}")
    lines.append(f"Invalid: {len(results.get('invalid_leads', []))}")
    
    # Scoring summary
    if results.get("score_stats"):
        stats = results["score_stats"]
        lines.append("")
        lines.append("Scoring:")
        lines.append(f"  HOT: {stats.get('hot', 0)}")
        lines.append(f"  WARM: {stats.get('warm', 0)}")
        lines.append(f"  COLD: {stats.get('cold', 0)}")
        lines.append(f"  Avg Score: {stats.get('avg_score', 0):.1f}")
    
    # Individual leads
    if include_leads and results.get("scored_leads"):
        lines.append("")
        lines.append("-" * 60)
        lines.append("Lead Details:")
        lines.append("-" * 60)
        for i, lead in enumerate(results["scored_leads"], 1):
            category = lead.get("score_category", "unknown").upper()
            lines.append(f"{i}. {lead.get('name', 'N/A')} <{lead.get('email', 'N/A')}> [{category}]")
    
    lines.append("")
    lines.append("=" * 60)
    
    return "\n".join(lines)

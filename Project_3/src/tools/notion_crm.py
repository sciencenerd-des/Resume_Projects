"""Notion CRM Tool for Lead Processing Agent.

Adds validated leads to a Notion database.
"""
import os
from typing import Dict, Any, Optional, List
from datetime import datetime


def _get_notion_client():
    """Get Notion client, returns None if not configured."""
    try:
        from notion_client import Client
        api_key = os.getenv("NOTION_API_KEY")
        if api_key:
            return Client(auth=api_key)
    except ImportError:
        pass
    return None


def add_lead_to_notion(
    name: str,
    email: str,
    company: Optional[str] = None,
    tags: Optional[str] = None,
    source: Optional[str] = None
) -> Dict[str, Any]:
    """
    Add a validated lead to the Notion CRM database.
    
    Args:
        name: Lead's full name
        email: Validated email address
        company: Company name (optional)
        tags: Comma-separated tags (optional)
        source: Lead source (optional)
        
    Returns:
        Dict with lead_id and status, or error info
    """
    notion = _get_notion_client()
    database_id = os.getenv("NOTION_DATABASE_ID")
    
    if not notion:
        # Demo mode - simulate success
        return {
            "lead_id": f"demo-{hash(email) % 100000:05d}",
            "status": "simulated",
            "message": "Demo mode: Notion not configured",
            "data": {"name": name, "email": email}
        }
    
    if not database_id:
        return {
            "status": "error",
            "message": "NOTION_DATABASE_ID not configured"
        }
    
    # Build properties for Notion page
    properties = {
        "Name": {"title": [{"text": {"content": name}}]},
        "Email": {"email": email},
        "Created": {"date": {"start": datetime.now().isoformat()}}
    }
    
    if company:
        properties["Company"] = {"rich_text": [{"text": {"content": company}}]}
    
    if tags:
        tag_list = [{"name": t.strip()} for t in tags.split(",") if t.strip()]
        if tag_list:
            properties["Tags"] = {"multi_select": tag_list}
    
    if source:
        properties["Source"] = {"select": {"name": source}}
    
    try:
        response = notion.pages.create(
            parent={"database_id": database_id},
            properties=properties
        )
        
        return {
            "lead_id": response["id"],
            "status": "created",
            "url": response.get("url", "")
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }


def add_leads_batch(leads: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Add multiple leads to Notion CRM.
    
    Args:
        leads: List of lead dicts with name, email, company, tags fields
        
    Returns:
        Summary of batch operation
    """
    results = []
    success_count = 0
    error_count = 0
    
    for lead in leads:
        result = add_lead_to_notion(
            name=lead.get("name", "Unknown"),
            email=lead.get("email", ""),
            company=lead.get("company"),
            tags=lead.get("tags"),
            source=lead.get("source", "csv_import")
        )
        results.append(result)
        
        if result.get("status") in ["created", "simulated"]:
            success_count += 1
        else:
            error_count += 1
    
    return {
        "total": len(leads),
        "success": success_count,
        "errors": error_count,
        "results": results
    }

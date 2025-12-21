"""Slack File Handler for Lead Processing Agent.

Downloads and processes CSV file attachments from Slack messages.
"""
import os
import hmac
import hashlib
import tempfile
import time
from typing import Dict, Any, Optional, Tuple
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError
import json


def _get_slack_bot_token() -> Optional[str]:
    """Get Slack bot token from environment."""
    return os.getenv("SLACK_BOT_TOKEN")


def _get_slack_signing_secret() -> Optional[str]:
    """Get Slack signing secret from environment."""
    return os.getenv("SLACK_SIGNING_SECRET")


def verify_slack_signature(
    body: bytes,
    timestamp: str,
    signature: str
) -> bool:
    """
    Verify that a request came from Slack using the signing secret.
    
    Args:
        body: Raw request body bytes
        timestamp: X-Slack-Request-Timestamp header
        signature: X-Slack-Signature header
        
    Returns:
        True if signature is valid, False otherwise
    """
    signing_secret = _get_slack_signing_secret()
    
    if not signing_secret:
        print("[DEBUG] No SLACK_SIGNING_SECRET configured, skipping verification", flush=True)
        return True
    
    # Check timestamp to prevent replay attacks (allow 5 min window)
    try:
        request_time = int(timestamp)
        current_time = int(time.time())
        if abs(current_time - request_time) > 300:
            print(f"[DEBUG] Timestamp expired: {abs(current_time - request_time)}s difference", flush=True)
            return False
    except (ValueError, TypeError) as e:
        print(f"[DEBUG] Invalid timestamp format: {e}", flush=True)
        return False
    
    # Compute expected signature
    sig_basestring = f"v0:{timestamp}:{body.decode('utf-8')}"
    expected_sig = 'v0=' + hmac.new(
        signing_secret.encode('utf-8'),
        sig_basestring.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    if hmac.compare_digest(expected_sig, signature):
        return True
    else:
        print(f"[DEBUG] Signature mismatch. Expected: {expected_sig[:10]}..., Got: {signature[:10]}...", flush=True)
        return False


def get_file_info(file_id: str) -> Dict[str, Any]:
    """
    Get file information from Slack API.
    
    Args:
        file_id: Slack file ID
        
    Returns:
        Dict with file information including name, mimetype, url_private_download
    """
    bot_token = _get_slack_bot_token()
    
    if not bot_token:
        print("[DEBUG] SLACK_BOT_TOKEN missing in get_file_info", flush=True)
        return {
            "ok": False,
            "error": "SLACK_BOT_TOKEN not configured"
        }
    
    try:
        print(f"[DEBUG] Fetching file info for {file_id}", flush=True)
        request = Request(
            f"https://slack.com/api/files.info?file={file_id}",
            headers={
                "Authorization": f"Bearer {bot_token}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        
        with urlopen(request, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            if not data.get("ok"):
                print(f"[DEBUG] Slack API returned error in files.info: {data.get('error')}", flush=True)
            return data
            
    except (URLError, HTTPError) as e:
        print(f"[DEBUG] HTTP error in files.info: {e}", flush=True)
        return {
            "ok": False,
            "error": str(e)
        }


def is_csv_file(file_info: Dict[str, Any]) -> bool:
    """
    Check if a Slack file is a CSV.
    
    Args:
        file_info: File info from Slack API
        
    Returns:
        True if file is a CSV, False otherwise
    """
    if not file_info.get("ok", False):
        return False
    
    file_data = file_info.get("file", {})
    
    # Check by mimetype
    mimetype = file_data.get("mimetype", "")
    print(f"[DEBUG] Checking file type: mimetype={mimetype}, extension={file_data.get('name', '').split('.')[-1]}", flush=True)
    if mimetype in ["text/csv", "application/csv", "text/comma-separated-values"]:
        return True
    
    # Check by file extension
    filename = file_data.get("name", "")
    if filename.lower().endswith(".csv"):
        return True
    
    # Check by filetype field
    filetype = file_data.get("filetype", "")
    if filetype == "csv":
        return True
    
    return False


def download_slack_file(file_info: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """
    Download a file from Slack to a temporary location.
    
    Args:
        file_info: File info dict from Slack API (result of get_file_info)
        
    Returns:
        Tuple of (temp_file_path, error_message)
        If successful, error_message is None
        If failed, temp_file_path is None
    """
    bot_token = _get_slack_bot_token()
    
    if not bot_token:
        return None, "SLACK_BOT_TOKEN not configured"
    
    if not file_info.get("ok", False):
        return None, file_info.get("error", "Invalid file info")
    
    file_data = file_info.get("file", {})
    download_url = file_data.get("url_private_download")
    
    if not download_url:
        print("[DEBUG] No download URL found (check Slack app scopes: files:read)", flush=True)
        return None, "No download URL in file info"
    
    try:
        print(f"[DEBUG] Downloading file from {download_url}", flush=True)
        request = Request(
            download_url,
            headers={
                "Authorization": f"Bearer {bot_token}"
            }
        )
        
        with urlopen(request, timeout=30) as response:
            content = response.read()
            print(f"[DEBUG] Downloaded {len(content)} bytes")
            
            # Write to temp file
            filename = file_data.get("name", "leads.csv")
            with tempfile.NamedTemporaryFile(
                mode='wb',
                suffix='.csv',
                prefix=f"slack_{filename.replace('.csv', '')}_",
                delete=False
            ) as f:
                f.write(content)
                return f.name, None
                
    except (URLError, HTTPError) as e:
        print(f"[DEBUG] Download failed with error: {e}")
        return None, f"Download failed: {str(e)}"


def post_message_to_channel(
    channel_id: str,
    message: str,
    thread_ts: Optional[str] = None
) -> Dict[str, Any]:
    """
    Post a message to a Slack channel.
    
    Args:
        channel_id: Slack channel ID
        message: Message text (supports markdown)
        thread_ts: Optional thread timestamp to reply in thread
        
    Returns:
        Slack API response
    """
    bot_token = _get_slack_bot_token()
    
    if not bot_token:
        print(f"[DEBUG] Simulated Slack Message to {channel_id}: {message}")
        return {
            "ok": False,
            "error": "SLACK_BOT_TOKEN not configured",
            "simulated": True,
            "message": message
        }
    
    payload = {
        "channel": channel_id,
        "text": message,
        "mrkdwn": True
    }
    
    if thread_ts:
        payload["thread_ts"] = thread_ts
    
    try:
        print(f"[DEBUG] Posting message to channel {channel_id}")
        data = json.dumps(payload).encode('utf-8')
        request = Request(
            "https://slack.com/api/chat.postMessage",
            data=data,
            headers={
                "Authorization": f"Bearer {bot_token}",
                "Content-Type": "application/json"
            }
        )
        
        with urlopen(request, timeout=10) as response:
            resp_data = json.loads(response.read().decode('utf-8'))
            if not resp_data.get("ok"):
                print(f"[DEBUG] Slack chat.postMessage failed: {resp_data.get('error')}")
            return resp_data
            
    except (URLError, HTTPError) as e:
        print(f"[DEBUG] Slack chat.postMessage HTTP error: {e}")
        return {
            "ok": False,
            "error": str(e)
        }



def get_message_by_timestamp(
    channel_id: str,
    message_ts: str
) -> Optional[Dict[str, Any]]:
    """
    Fetch a message from a channel by timestamp.
    
    Args:
        channel_id: Slack channel ID
        message_ts: Message timestamp
        
    Returns:
        Message object or None if not found
    """
    bot_token = _get_slack_bot_token()
    
    if not bot_token:
        return None
    
    try:
        # Use conversations.history to fetch the message
        request = Request(
            f"https://slack.com/api/conversations.history?channel={channel_id}&latest={message_ts}&limit=1&inclusive=true",
            headers={
                "Authorization": f"Bearer {bot_token}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
        )
        
        with urlopen(request, timeout=10) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get("ok") and data.get("messages"):
                return data["messages"][0]
            return None
            
    except (URLError, HTTPError) as e:
        print(f"[DEBUG] Error fetching message: {e}", flush=True)
        return None


def format_processing_result_message(
    filename: str,
    results: Dict[str, Any]
) -> str:
    """
    Format lead processing results as a Slack message.
    
    Args:
        filename: Original CSV filename
        results: Processing results from agent
        
    Returns:
        Formatted Slack message string
    """
    status = results.get("status", "unknown")
    
    if status == "complete":
        valid_count = len(results.get("valid_leads", []))
        invalid_count = len(results.get("invalid_leads", []))
        total = valid_count + invalid_count
        
        score_stats = results.get("score_stats", {})
        hot = score_stats.get("hot", 0)
        warm = score_stats.get("warm", 0)
        cold = score_stats.get("cold", 0)
        
        notion_results = results.get("notion_results", {})
        synced = notion_results.get("success", 0)
        
        lines = [
            f"✅ *Lead Processing Complete*",
            f"",
            f"📁 *File:* `{filename}`",
            f"",
            f"📊 *Summary:*",
            f"• Total Leads: `{total}`",
            f"• Valid: `{valid_count}` ✅  |  Invalid: `{invalid_count}` ❌",
            f"",
            f"🎯 *Lead Scores:*",
            f"• 🔥 Hot: `{hot}`  |  🌡️ Warm: `{warm}`  |  ❄️ Cold: `{cold}`",
        ]
        
        if synced > 0:
            lines.append(f"")
            lines.append(f"📝 *Synced to Notion:* `{synced}` leads")
        
        return "\n".join(lines)
    
    else:
        error = results.get("error", "Unknown error")
        return f"❌ *Lead Processing Failed*\n\n📁 *File:* `{filename}`\n\n*Error:* `{error}`"

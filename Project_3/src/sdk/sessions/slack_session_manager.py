"""Slack Session Manager for OpenAI Agents SDK.

Manages persistent conversational sessions for Slack interactions, enabling
multi-turn conversations with context preservation.

Features:
- Redis-backed storage for production (with TTL)
- In-memory fallback for development
- Session isolation by channel + thread
- Automatic session expiration
"""

import os
import json
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

# Conditional Redis import
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class SlackSessionManager:
    """Manages conversational sessions for Slack interactions.

    Sessions are identified by (channel_id, thread_ts) tuples and store:
    - Conversation history
    - Agent state
    - Context variables
    - Last activity timestamp
    """

    def __init__(self, redis_url: Optional[str] = None, ttl_seconds: int = 86400):
        """Initialize session manager.

        Args:
            redis_url: Redis connection URL (e.g., redis://localhost:6379)
            ttl_seconds: Session TTL in seconds (default: 24 hours)
        """
        self.ttl_seconds = ttl_seconds
        self.redis_client = None
        self.memory_sessions: Dict[str, Dict[str, Any]] = {}

        # Try to connect to Redis if URL provided
        if redis_url and REDIS_AVAILABLE:
            try:
                self.redis_client = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=5
                )
                # Test connection
                self.redis_client.ping()
                print(f"[SessionManager] Connected to Redis at {redis_url}")
            except Exception as e:
                print(f"[SessionManager] Failed to connect to Redis: {e}")
                print("[SessionManager] Falling back to in-memory sessions")
                self.redis_client = None
        else:
            if not REDIS_AVAILABLE:
                print("[SessionManager] Redis not installed, using in-memory sessions")
            else:
                print("[SessionManager] No Redis URL provided, using in-memory sessions")

    def _make_session_key(self, channel_id: str, thread_ts: str) -> str:
        """Create session key from channel and thread.

        Args:
            channel_id: Slack channel ID
            thread_ts: Thread timestamp (or message ts for new threads)

        Returns:
            Session key string
        """
        return f"slack_session:{channel_id}:{thread_ts}"

    def get_session(self, channel_id: str, thread_ts: str) -> Optional[Dict[str, Any]]:
        """Retrieve session data.

        Args:
            channel_id: Slack channel ID
            thread_ts: Thread timestamp

        Returns:
            Session data dict or None if not found
        """
        session_key = self._make_session_key(channel_id, thread_ts)

        # Try Redis first
        if self.redis_client:
            try:
                data = self.redis_client.get(session_key)
                if data:
                    return json.loads(data)
            except Exception as e:
                print(f"[SessionManager] Redis get failed: {e}")

        # Fallback to memory
        return self.memory_sessions.get(session_key)

    def save_session(
        self,
        channel_id: str,
        thread_ts: str,
        session_data: Dict[str, Any]
    ) -> bool:
        """Save session data.

        Args:
            channel_id: Slack channel ID
            thread_ts: Thread timestamp
            session_data: Session data to save

        Returns:
            True if saved successfully
        """
        session_key = self._make_session_key(channel_id, thread_ts)

        # Add metadata
        session_data["last_activity"] = datetime.utcnow().isoformat()
        session_data["channel_id"] = channel_id
        session_data["thread_ts"] = thread_ts

        # Try Redis first
        if self.redis_client:
            try:
                serialized = json.dumps(session_data)
                self.redis_client.setex(
                    session_key,
                    self.ttl_seconds,
                    serialized
                )
                return True
            except Exception as e:
                print(f"[SessionManager] Redis save failed: {e}")

        # Fallback to memory
        self.memory_sessions[session_key] = session_data
        return True

    def delete_session(self, channel_id: str, thread_ts: str) -> bool:
        """Delete session data.

        Args:
            channel_id: Slack channel ID
            thread_ts: Thread timestamp

        Returns:
            True if deleted successfully
        """
        session_key = self._make_session_key(channel_id, thread_ts)

        # Try Redis first
        if self.redis_client:
            try:
                self.redis_client.delete(session_key)
            except Exception as e:
                print(f"[SessionManager] Redis delete failed: {e}")

        # Also delete from memory
        if session_key in self.memory_sessions:
            del self.memory_sessions[session_key]

        return True

    def session_exists(self, channel_id: str, thread_ts: str) -> bool:
        """Check if session exists.

        Args:
            channel_id: Slack channel ID
            thread_ts: Thread timestamp

        Returns:
            True if session exists
        """
        return self.get_session(channel_id, thread_ts) is not None

    def update_session_context(
        self,
        channel_id: str,
        thread_ts: str,
        context_update: Dict[str, Any]
    ) -> bool:
        """Update session context without replacing entire session.

        Args:
            channel_id: Slack channel ID
            thread_ts: Thread timestamp
            context_update: Context fields to update

        Returns:
            True if updated successfully
        """
        session = self.get_session(channel_id, thread_ts)
        if not session:
            # Create new session
            session = {"context": {}}

        # Update context
        if "context" not in session:
            session["context"] = {}
        session["context"].update(context_update)

        return self.save_session(channel_id, thread_ts, session)

    def cleanup_expired_sessions(self) -> int:
        """Clean up expired in-memory sessions.

        Note: Redis handles TTL automatically, this only cleans memory sessions.

        Returns:
            Number of sessions cleaned up
        """
        if not self.memory_sessions:
            return 0

        now = datetime.utcnow()
        expired_keys = []

        for key, session in self.memory_sessions.items():
            if "last_activity" in session:
                last_activity = datetime.fromisoformat(session["last_activity"])
                age = (now - last_activity).total_seconds()

                if age > self.ttl_seconds:
                    expired_keys.append(key)

        # Delete expired sessions
        for key in expired_keys:
            del self.memory_sessions[key]

        if expired_keys:
            print(f"[SessionManager] Cleaned up {len(expired_keys)} expired sessions")

        return len(expired_keys)

    def get_stats(self) -> Dict[str, Any]:
        """Get session manager statistics.

        Returns:
            Stats dict with session counts and storage info
        """
        stats = {
            "storage_backend": "redis" if self.redis_client else "memory",
            "ttl_seconds": self.ttl_seconds,
            "memory_sessions_count": len(self.memory_sessions)
        }

        if self.redis_client:
            try:
                # Count Redis sessions
                keys = self.redis_client.keys("slack_session:*")
                stats["redis_sessions_count"] = len(keys) if keys else 0
            except Exception:
                stats["redis_sessions_count"] = "unknown"

        return stats


# Factory function
def create_session_manager(
    redis_url: Optional[str] = None,
    ttl_seconds: Optional[int] = None
) -> SlackSessionManager:
    """Create and configure a session manager.

    Args:
        redis_url: Redis URL (defaults to REDIS_URL env var)
        ttl_seconds: Session TTL (defaults to SESSION_TTL_SECONDS env var or 24h)

    Returns:
        Configured SlackSessionManager instance
    """
    if redis_url is None:
        redis_url = os.getenv("REDIS_URL")

    if ttl_seconds is None:
        ttl_seconds = int(os.getenv("SESSION_TTL_SECONDS", "86400"))

    return SlackSessionManager(redis_url=redis_url, ttl_seconds=ttl_seconds)


# Export
__all__ = ["SlackSessionManager", "create_session_manager"]

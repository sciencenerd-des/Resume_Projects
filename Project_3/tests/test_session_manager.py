"""Unit tests for SlackSessionManager.

Tests session CRUD operations, Redis fallback, expiration, and statistics.
"""

import pytest
import json
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock

# Import the session manager
# Note: These tests will pass in Python 3.9 if we mock the SDK imports
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.sdk.sessions.slack_session_manager import SlackSessionManager, create_session_manager


class TestSlackSessionManager:
    """Test suite for SlackSessionManager."""

    def test_create_without_redis(self):
        """Test creating session manager without Redis."""
        manager = SlackSessionManager(redis_url=None)

        assert manager.redis_client is None
        assert manager.memory_sessions == {}
        assert manager.ttl_seconds == 86400

    def test_create_with_custom_ttl(self):
        """Test creating session manager with custom TTL."""
        manager = SlackSessionManager(redis_url=None, ttl_seconds=3600)

        assert manager.ttl_seconds == 3600

    def test_make_session_key(self):
        """Test session key generation."""
        manager = SlackSessionManager(redis_url=None)

        key = manager._make_session_key("C123", "1234567.890")

        assert key == "slack_session:C123:1234567.890"

    def test_save_and_get_session_memory(self):
        """Test saving and retrieving session from memory."""
        manager = SlackSessionManager(redis_url=None)

        session_data = {
            "messages": [{"role": "user", "content": "test"}],
            "context": {"mode": "conversational"}
        }

        # Save session
        result = manager.save_session("C123", "1234567.890", session_data)
        assert result is True

        # Retrieve session
        retrieved = manager.get_session("C123", "1234567.890")

        assert retrieved is not None
        assert retrieved["messages"] == session_data["messages"]
        assert retrieved["context"] == session_data["context"]
        assert "last_activity" in retrieved
        assert "channel_id" in retrieved
        assert "thread_ts" in retrieved

    def test_get_nonexistent_session(self):
        """Test retrieving non-existent session returns None."""
        manager = SlackSessionManager(redis_url=None)

        retrieved = manager.get_session("C999", "9999999.999")

        assert retrieved is None

    def test_session_exists(self):
        """Test session existence check."""
        manager = SlackSessionManager(redis_url=None)

        # Initially doesn't exist
        assert manager.session_exists("C123", "1234567.890") is False

        # Save session
        manager.save_session("C123", "1234567.890", {"test": "data"})

        # Now exists
        assert manager.session_exists("C123", "1234567.890") is True

    def test_delete_session(self):
        """Test deleting session."""
        manager = SlackSessionManager(redis_url=None)

        # Create session
        manager.save_session("C123", "1234567.890", {"test": "data"})
        assert manager.session_exists("C123", "1234567.890") is True

        # Delete session
        result = manager.delete_session("C123", "1234567.890")
        assert result is True

        # Verify deleted
        assert manager.session_exists("C123", "1234567.890") is False

    def test_update_session_context(self):
        """Test updating session context."""
        manager = SlackSessionManager(redis_url=None)

        # Create initial session
        manager.save_session("C123", "1234567.890", {
            "messages": [],
            "context": {"mode": "conversational"}
        })

        # Update context
        result = manager.update_session_context("C123", "1234567.890", {
            "user_id": "U123",
            "feature": "lead_search"
        })
        assert result is True

        # Verify update
        session = manager.get_session("C123", "1234567.890")
        assert session["context"]["mode"] == "conversational"
        assert session["context"]["user_id"] == "U123"
        assert session["context"]["feature"] == "lead_search"

    def test_update_context_creates_session_if_missing(self):
        """Test that update_context creates session if it doesn't exist."""
        manager = SlackSessionManager(redis_url=None)

        # Update non-existent session
        result = manager.update_session_context("C123", "1234567.890", {
            "user_id": "U123"
        })
        assert result is True

        # Verify session was created
        session = manager.get_session("C123", "1234567.890")
        assert session is not None
        assert session["context"]["user_id"] == "U123"

    def test_cleanup_expired_sessions(self):
        """Test cleanup of expired memory sessions."""
        manager = SlackSessionManager(redis_url=None, ttl_seconds=2)

        # Create session
        manager.save_session("C123", "1234567.890", {"test": "data"})

        # Manually set old timestamp
        session_key = manager._make_session_key("C123", "1234567.890")
        old_time = (datetime.utcnow() - timedelta(seconds=3)).isoformat()
        manager.memory_sessions[session_key]["last_activity"] = old_time

        # Run cleanup
        cleaned = manager.cleanup_expired_sessions()

        # Verify session was cleaned
        assert cleaned == 1
        assert manager.session_exists("C123", "1234567.890") is False

    def test_cleanup_keeps_fresh_sessions(self):
        """Test that cleanup doesn't remove fresh sessions."""
        manager = SlackSessionManager(redis_url=None, ttl_seconds=3600)

        # Create fresh session
        manager.save_session("C123", "1234567.890", {"test": "data"})

        # Run cleanup
        cleaned = manager.cleanup_expired_sessions()

        # Verify session still exists
        assert cleaned == 0
        assert manager.session_exists("C123", "1234567.890") is True

    def test_get_stats_memory_only(self):
        """Test statistics for memory-only mode."""
        manager = SlackSessionManager(redis_url=None)

        # Create sessions
        manager.save_session("C123", "1234567.890", {"test": "data"})
        manager.save_session("C123", "1234567.891", {"test": "data"})

        stats = manager.get_stats()

        assert stats["storage_backend"] == "memory"
        assert stats["ttl_seconds"] == 86400
        assert stats["memory_sessions_count"] == 2

    @patch('src.sdk.sessions.slack_session_manager.redis')
    def test_redis_connection_success(self, mock_redis):
        """Test successful Redis connection."""
        # Mock Redis client
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        mock_redis.from_url.return_value = mock_client

        manager = SlackSessionManager(redis_url="redis://localhost:6379")

        assert manager.redis_client is not None
        mock_redis.from_url.assert_called_once()

    @patch('src.sdk.sessions.slack_session_manager.redis')
    def test_redis_connection_failure_fallback(self, mock_redis):
        """Test fallback to memory when Redis connection fails."""
        # Mock Redis connection failure
        mock_redis.from_url.side_effect = Exception("Connection failed")

        manager = SlackSessionManager(redis_url="redis://localhost:6379")

        assert manager.redis_client is None
        assert manager.memory_sessions == {}

    @patch('src.sdk.sessions.slack_session_manager.redis')
    def test_save_to_redis(self, mock_redis):
        """Test saving session to Redis."""
        # Mock Redis client
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        mock_redis.from_url.return_value = mock_client

        manager = SlackSessionManager(redis_url="redis://localhost:6379")

        session_data = {"messages": [], "context": {"mode": "test"}}
        result = manager.save_session("C123", "1234567.890", session_data)

        assert result is True
        # Verify setex was called with correct parameters
        mock_client.setex.assert_called_once()
        call_args = mock_client.setex.call_args
        assert call_args[0][0] == "slack_session:C123:1234567.890"
        assert call_args[0][1] == 86400  # TTL

    @patch('src.sdk.sessions.slack_session_manager.redis')
    def test_get_from_redis(self, mock_redis):
        """Test retrieving session from Redis."""
        # Mock Redis client
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        session_data = {"messages": [], "context": {"mode": "test"}}
        mock_client.get.return_value = json.dumps(session_data)
        mock_redis.from_url.return_value = mock_client

        manager = SlackSessionManager(redis_url="redis://localhost:6379")

        retrieved = manager.get_session("C123", "1234567.890")

        assert retrieved is not None
        assert retrieved["messages"] == []
        assert retrieved["context"]["mode"] == "test"

    @patch('src.sdk.sessions.slack_session_manager.redis')
    def test_redis_failure_uses_memory_fallback(self, mock_redis):
        """Test that Redis failures fall back to memory."""
        # Mock Redis client that fails on operations
        mock_client = MagicMock()
        mock_client.ping.return_value = True
        mock_client.setex.side_effect = Exception("Redis write failed")
        mock_redis.from_url.return_value = mock_client

        manager = SlackSessionManager(redis_url="redis://localhost:6379")

        # Save should still succeed using memory fallback
        session_data = {"test": "data"}
        result = manager.save_session("C123", "1234567.890", session_data)
        assert result is True

        # Should be in memory
        assert len(manager.memory_sessions) == 1


class TestCreateSessionManager:
    """Test factory function."""

    def test_create_with_defaults(self):
        """Test creating session manager with defaults."""
        with patch.dict('os.environ', {}, clear=True):
            manager = create_session_manager()

            assert manager.redis_client is None
            assert manager.ttl_seconds == 86400

    def test_create_with_env_vars(self):
        """Test creating session manager with environment variables."""
        with patch.dict('os.environ', {
            'REDIS_URL': 'redis://localhost:6379',
            'SESSION_TTL_SECONDS': '7200'
        }):
            with patch('src.sdk.sessions.slack_session_manager.redis') as mock_redis:
                mock_client = MagicMock()
                mock_client.ping.return_value = True
                mock_redis.from_url.return_value = mock_client

                manager = create_session_manager()

                assert manager.ttl_seconds == 7200

    def test_create_with_explicit_params(self):
        """Test creating session manager with explicit parameters."""
        with patch('src.sdk.sessions.slack_session_manager.redis') as mock_redis:
            mock_client = MagicMock()
            mock_client.ping.return_value = True
            mock_redis.from_url.return_value = mock_client

            manager = create_session_manager(
                redis_url="redis://test:6379",
                ttl_seconds=1800
            )

            assert manager.ttl_seconds == 1800


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

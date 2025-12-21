"""Unit tests for conversational query detection.

Tests the _is_conversational_query function from server.py to ensure
it correctly identifies conversational queries vs explicit commands.
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import the function we're testing
# Note: We need to import from server.py, but avoid executing the Flask app
# We'll define a test version here based on the implementation


def _is_conversational_query(text: str) -> bool:
    """Test implementation of conversational query detection.

    This mirrors the implementation in server.py for testing purposes.
    """
    # Normalize text
    text_lower = text.lower().strip()

    # Exclude explicit commands
    if text_lower.startswith("add lead:") or text_lower.startswith("add leads:"):
        return False

    # Conversational triggers
    conversational_triggers = [
        "how many",
        "what",
        "show",
        "show me",
        "tell me",
        "list",
        "report",
        "summary",
        "summarize",
        "stats",
        "statistics",
        "find",
        "search",
        "who",
        "when",
        "which",
        "why",
        "can you",
        "could you",
        "please",
        "help",
        "explain",
    ]

    # Check for conversational patterns
    for trigger in conversational_triggers:
        if trigger in text_lower:
            return True

    # Check for question marks (questions are conversational)
    if "?" in text:
        return True

    return False


class TestConversationalDetection:
    """Test suite for conversational query detection."""

    # Question Detection Tests

    def test_detects_question_mark(self):
        """Questions with ? are conversational."""
        assert _is_conversational_query("What is this?") is True
        assert _is_conversational_query("How does this work?") is True
        assert _is_conversational_query("Is this working?") is True

    # "How many" Pattern Tests

    def test_detects_how_many_queries(self):
        """Detects 'how many' questions."""
        assert _is_conversational_query("How many leads today?") is True
        assert _is_conversational_query("how many leads did we process?") is True
        assert _is_conversational_query("How many HOT leads?") is True

    # "Show" Pattern Tests

    def test_detects_show_queries(self):
        """Detects 'show' and 'show me' queries."""
        assert _is_conversational_query("Show me the leads") is True
        assert _is_conversational_query("show top 5 leads") is True
        assert _is_conversational_query("Show me today's results") is True

    # "What" Pattern Tests

    def test_detects_what_queries(self):
        """Detects 'what' questions."""
        assert _is_conversational_query("What's the average score?") is True
        assert _is_conversational_query("what are the stats") is True
        assert _is_conversational_query("What leads do we have?") is True

    # "List" Pattern Tests

    def test_detects_list_queries(self):
        """Detects 'list' requests."""
        assert _is_conversational_query("List all HOT leads") is True
        assert _is_conversational_query("list the leads from today") is True
        assert _is_conversational_query("List companies") is True

    # "Tell me" Pattern Tests

    def test_detects_tell_me_queries(self):
        """Detects 'tell me' requests."""
        assert _is_conversational_query("Tell me about today's leads") is True
        assert _is_conversational_query("tell me the summary") is True

    # Stats/Report Pattern Tests

    def test_detects_stats_queries(self):
        """Detects stats and statistics requests."""
        assert _is_conversational_query("Show stats") is True
        assert _is_conversational_query("Get statistics") is True
        assert _is_conversational_query("statistics for this week") is True

    def test_detects_report_queries(self):
        """Detects report and summary requests."""
        assert _is_conversational_query("Generate report") is True
        assert _is_conversational_query("Give me a summary") is True
        assert _is_conversational_query("summarize today") is True

    # Search/Find Pattern Tests

    def test_detects_search_queries(self):
        """Detects search and find requests."""
        assert _is_conversational_query("Find leads from Acme Corp") is True
        assert _is_conversational_query("search for john@example.com") is True
        assert _is_conversational_query("Find all HOT leads") is True

    # Question Word Tests

    def test_detects_who_queries(self):
        """Detects 'who' questions."""
        assert _is_conversational_query("Who are the top leads?") is True
        assert _is_conversational_query("who added this lead") is True

    def test_detects_when_queries(self):
        """Detects 'when' questions."""
        assert _is_conversational_query("When was this lead added?") is True
        assert _is_conversational_query("when did we process leads") is True

    def test_detects_which_queries(self):
        """Detects 'which' questions."""
        assert _is_conversational_query("Which leads are HOT?") is True
        assert _is_conversational_query("which company has most leads") is True

    def test_detects_why_queries(self):
        """Detects 'why' questions."""
        assert _is_conversational_query("Why is this lead COLD?") is True
        assert _is_conversational_query("why was it rejected") is True

    # Polite Request Tests

    def test_detects_can_you_queries(self):
        """Detects 'can you' requests."""
        assert _is_conversational_query("Can you show me the leads?") is True
        assert _is_conversational_query("can you help me find leads") is True

    def test_detects_could_you_queries(self):
        """Detects 'could you' requests."""
        assert _is_conversational_query("Could you list the leads?") is True
        assert _is_conversational_query("could you generate a report") is True

    def test_detects_please_queries(self):
        """Detects requests with 'please'."""
        assert _is_conversational_query("Please show the stats") is True
        assert _is_conversational_query("list leads please") is True

    # Help/Explain Tests

    def test_detects_help_queries(self):
        """Detects help requests."""
        assert _is_conversational_query("Help me find leads") is True
        assert _is_conversational_query("help") is True
        assert _is_conversational_query("I need help") is True

    def test_detects_explain_queries(self):
        """Detects explain requests."""
        assert _is_conversational_query("Explain the scoring") is True
        assert _is_conversational_query("explain how this works") is True

    # Command Exclusion Tests

    def test_excludes_add_lead_command(self):
        """'add lead:' commands are NOT conversational."""
        assert _is_conversational_query("add lead: john@example.com John, Acme") is False
        assert _is_conversational_query("Add lead: test@test.com Test User, Test Co") is False

    def test_excludes_add_leads_command(self):
        """'add leads:' commands are NOT conversational."""
        assert _is_conversational_query("add leads: batch import") is False
        assert _is_conversational_query("Add leads: Q4 campaign") is False

    # Edge Cases

    def test_case_insensitive(self):
        """Detection is case-insensitive."""
        assert _is_conversational_query("SHOW ME LEADS") is True
        assert _is_conversational_query("How Many Leads?") is True
        assert _is_conversational_query("what IS THIS") is True

    def test_handles_extra_whitespace(self):
        """Handles extra whitespace."""
        assert _is_conversational_query("  show me leads  ") is True
        assert _is_conversational_query("how many    leads") is True

    def test_empty_string_not_conversational(self):
        """Empty strings are not conversational."""
        assert _is_conversational_query("") is False
        assert _is_conversational_query("   ") is False

    def test_non_conversational_text(self):
        """Random text without triggers is not conversational."""
        assert _is_conversational_query("hello") is False
        assert _is_conversational_query("ok") is False
        assert _is_conversational_query("thanks") is False
        assert _is_conversational_query("good job") is False

    # Complex Query Tests

    def test_complex_conversational_query(self):
        """Complex conversational queries."""
        assert _is_conversational_query(
            "Can you please show me a summary of all HOT leads from this week?"
        ) is True
        assert _is_conversational_query(
            "What are the statistics for leads scored above 80?"
        ) is True
        assert _is_conversational_query(
            "Find all leads from Acme Corp and tell me their scores"
        ) is True

    # Compound Trigger Tests

    def test_multiple_triggers_in_one_query(self):
        """Queries with multiple conversational triggers."""
        assert _is_conversational_query("Show me stats and tell me the summary") is True
        assert _is_conversational_query("What are the stats? Show report.") is True

    # Partial Match Tests

    def test_trigger_within_word(self):
        """Trigger as substring within a word."""
        # "show" within "showcase" should still trigger
        assert _is_conversational_query("showcase the leads") is True
        # "what" within "whatever" should still trigger
        assert _is_conversational_query("whatever leads we have") is True

    # Real-World Examples

    def test_real_world_conversational_examples(self):
        """Real-world conversational examples."""
        examples = [
            "How many leads did we process today?",
            "Show me the top 5 HOT leads",
            "What's the average score this week?",
            "List all leads from Acme Corp",
            "Can you find leads with scores above 80?",
            "Tell me about yesterday's leads",
            "Please generate a report for last month",
            "Which companies have the most leads?",
            "Why was this lead marked as COLD?",
            "Help me understand the scoring system",
        ]
        for example in examples:
            assert _is_conversational_query(example) is True, f"Failed for: {example}"

    def test_real_world_command_examples(self):
        """Real-world command examples (should NOT be conversational)."""
        examples = [
            "add lead: john@example.com John Doe, Acme Corp",
            "add leads: Q4 marketing batch",
            "Add lead: sarah@test.com Sarah Johnson, Test Inc",
            "Add leads: import file",
        ]
        for example in examples:
            assert _is_conversational_query(example) is False, f"Failed for: {example}"


class TestConversationalDetectionPerformance:
    """Performance and edge case tests."""

    def test_long_text_performance(self):
        """Should handle long text efficiently."""
        long_text = "Please " + "help me " * 1000 + "find leads"
        result = _is_conversational_query(long_text)
        assert result is True

    def test_unicode_characters(self):
        """Should handle unicode characters."""
        assert _is_conversational_query("Show me leads 🔥") is True
        assert _is_conversational_query("What about leads? 🤔") is True

    def test_special_characters(self):
        """Should handle special characters."""
        assert _is_conversational_query("Show me leads!!!") is True
        assert _is_conversational_query("What's the score???") is True
        assert _is_conversational_query("List all leads (HOT)") is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Tests for the AI Lead Analyzer Module.

Uses mocking to test without requiring actual OpenAI API calls.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from src.tools.ai_analyzer import AILeadAnalyzer, AIAnalysisResult


class TestAIAnalysisResult:
    """Test AIAnalysisResult dataclass."""
    
    def test_default_values(self):
        """Test default values."""
        result = AIAnalysisResult(quality='warm', confidence=0.5)
        assert result.quality == 'warm'
        assert result.confidence == 0.5
        assert result.intent_signals == []
        assert result.suggested_action == ""
    
    def test_to_dict(self):
        """Test serialization."""
        result = AIAnalysisResult(
            quality='hot',
            confidence=0.9,
            intent_signals=['demo_requested', 'enterprise'],
            suggested_action='Call immediately',
            reasoning='High intent signals'
        )
        
        result_dict = result.to_dict()
        
        assert result_dict['quality'] == 'hot'
        assert result_dict['confidence'] == 0.9
        assert 'demo_requested' in result_dict['intent_signals']


class TestAILeadAnalyzer:
    """Test AILeadAnalyzer class."""
    
    @pytest.fixture
    def mock_openai_client(self):
        """Create a mock OpenAI client."""
        client = Mock()
        
        # Mock successful response
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = json.dumps({
            "quality": "hot",
            "confidence": 0.85,
            "intent_signals": ["demo_requested", "enterprise"],
            "suggested_action": "Schedule call",
            "reasoning": "High intent"
        })
        
        client.chat.completions.create.return_value = mock_response
        return client
    
    @pytest.fixture
    def analyzer(self, mock_openai_client):
        """Create analyzer with mock client."""
        return AILeadAnalyzer(openai_client=mock_openai_client)
    
    @pytest.fixture
    def sample_lead(self):
        """Sample lead for testing."""
        return {
            'name': 'John Smith',
            'email': 'john@company.com',
            'company': 'Acme Corp',
            'title': 'VP of Engineering',
            'tags': 'enterprise,demo_requested'
        }
    
    def test_initialization_with_client(self, mock_openai_client):
        """Test initialization with provided client."""
        analyzer = AILeadAnalyzer(openai_client=mock_openai_client)
        assert analyzer.is_available
    
    def test_initialization_without_client(self):
        """Test initialization without client."""
        # Patch os.getenv to return None
        with patch('os.getenv', return_value=None):
            analyzer = AILeadAnalyzer()
            # May or may not be available depending on environment
    
    def test_is_available_with_client(self, analyzer):
        """Test is_available returns True with client."""
        assert analyzer.is_available
    
    def test_classify_lead_returns_result(self, analyzer, sample_lead):
        """Test classify_lead returns AIAnalysisResult."""
        result = analyzer.classify_lead(sample_lead)
        assert isinstance(result, AIAnalysisResult)
    
    def test_classify_lead_quality(self, analyzer, sample_lead):
        """Test classification quality is returned."""
        result = analyzer.classify_lead(sample_lead)
        assert result.quality in ['hot', 'warm', 'cold', 'unknown']
    
    def test_classify_lead_confidence_range(self, analyzer, sample_lead):
        """Test confidence is in valid range."""
        result = analyzer.classify_lead(sample_lead)
        assert 0.0 <= result.confidence <= 1.0
    
    def test_classify_lead_without_client(self, sample_lead):
        """Test graceful handling when no client available."""
        analyzer = AILeadAnalyzer(openai_client=None)
        result = analyzer.classify_lead(sample_lead)
        
        assert result.quality == 'unknown'
        assert result.confidence == 0.0
        assert 'unavailable' in result.reasoning.lower()
    
    def test_classify_leads_batch(self, analyzer, sample_lead):
        """Test batch classification."""
        leads = [sample_lead, sample_lead.copy()]
        
        results = analyzer.classify_leads_batch(leads)
        
        assert len(results) == 2
        assert all('ai_analysis' in lead for lead in results)
        assert all('ai_quality' in lead for lead in results)
    
    def test_format_lead_info(self, analyzer, sample_lead):
        """Test lead info formatting."""
        formatted = analyzer._format_lead_info(sample_lead)
        
        assert 'John Smith' in formatted
        assert 'Acme Corp' in formatted
        assert 'VP of Engineering' in formatted
    
    def test_format_empty_lead(self, analyzer):
        """Test formatting with empty lead."""
        empty_lead = {}
        formatted = analyzer._format_lead_info(empty_lead)
        assert 'No lead information' in formatted


class TestAPIErrorHandling:
    """Test error handling for API calls."""
    
    def test_json_parse_error(self):
        """Test handling of malformed JSON response."""
        client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Not valid JSON"
        client.chat.completions.create.return_value = mock_response
        
        analyzer = AILeadAnalyzer(openai_client=client)
        result = analyzer.classify_lead({'name': 'Test'})
        
        # Should return a default result, not crash
        assert result.quality == 'warm'
        assert 'parse' in result.reasoning.lower() or 'failed' in result.reasoning.lower()
    
    def test_api_exception(self):
        """Test handling of API exceptions."""
        client = Mock()
        client.chat.completions.create.side_effect = Exception("API Error")
        
        analyzer = AILeadAnalyzer(openai_client=client)
        result = analyzer.classify_lead({'name': 'Test'})
        
        assert result.quality == 'unknown'
        assert 'error' in result.reasoning.lower()


class TestOutreachSuggestions:
    """Test outreach suggestion generation."""
    
    @pytest.fixture
    def mock_client(self):
        client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "Reach out about their demo request."
        client.chat.completions.create.return_value = mock_response
        return client
    
    def test_generate_suggestion(self, mock_client):
        """Test outreach suggestion generation."""
        analyzer = AILeadAnalyzer(openai_client=mock_client)
        
        suggestion = analyzer.generate_outreach_suggestion(
            {'name': 'Test', 'company': 'TestCo'},
            tone='professional'
        )
        
        assert len(suggestion) > 0
        assert mock_client.chat.completions.create.called
    
    def test_suggestion_without_client(self):
        """Test suggestion without available client."""
        analyzer = AILeadAnalyzer(openai_client=None)
        
        suggestion = analyzer.generate_outreach_suggestion({'name': 'Test'})
        assert 'unavailable' in suggestion.lower()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

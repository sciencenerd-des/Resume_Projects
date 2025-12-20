"""
Tests for the Lead Scoring Module.
"""

import pytest
import json
import tempfile
from pathlib import Path
from src.tools.lead_scorer import (
    LeadScorer,
    ScoringRule,
    ScoringResult,
    ScoreCategory
)


class TestScoringRule:
    """Test ScoringRule dataclass."""
    
    def test_valid_condition(self):
        """Test creating rule with valid condition."""
        rule = ScoringRule(
            field='company',
            condition='exists',
            value=None,
            points=20
        )
        assert rule.field == 'company'
        assert rule.condition == 'exists'
        assert rule.points == 20
    
    def test_invalid_condition_raises_error(self):
        """Test that invalid condition raises ValueError."""
        with pytest.raises(ValueError):
            ScoringRule(
                field='company',
                condition='invalid_condition',
                value=None,
                points=20
            )
    
    def test_default_description(self):
        """Test default empty description."""
        rule = ScoringRule(
            field='email',
            condition='contains',
            value='@company.com',
            points=10
        )
        assert rule.description == ""


class TestLeadScorer:
    """Test LeadScorer class."""
    
    @pytest.fixture
    def scorer(self):
        """Create scorer with default rules."""
        return LeadScorer()
    
    @pytest.fixture
    def custom_scorer(self):
        """Create scorer with custom rules."""
        rules = [
            ScoringRule(field='company', condition='exists', value=None, points=25),
            ScoringRule(field='email', condition='contains', value='enterprise', points=30),
            ScoringRule(field='tags', condition='contains', value='vip', points=50),
        ]
        return LeadScorer(rules=rules, max_score=100)
    
    def test_default_rules_created(self, scorer):
        """Test that default rules are created."""
        assert len(scorer.rules) > 0
    
    def test_default_thresholds(self, scorer):
        """Test default thresholds."""
        assert scorer.thresholds['hot'] == 70
        assert scorer.thresholds['warm'] == 40
        assert scorer.thresholds['cold'] == 0
    
    def test_score_lead_returns_result(self, scorer):
        """Test score_lead returns ScoringResult."""
        lead = {'name': 'Test', 'email': 'test@example.com'}
        result = scorer.score_lead(lead)
        assert isinstance(result, ScoringResult)
    
    def test_score_with_company(self, scorer):
        """Test that having a company adds points."""
        lead_with_company = {
            'name': 'John',
            'email': 'john@company.com',
            'company': 'Acme Corp'
        }
        lead_without_company = {
            'name': 'Jane',
            'email': 'jane@gmail.com',
            'company': ''
        }
        
        score_with = scorer.score_lead(lead_with_company)
        score_without = scorer.score_lead(lead_without_company)
        
        assert score_with.score >= score_without.score
    
    def test_score_with_vp_title(self, scorer):
        """Test VP title adds significant points."""
        lead_vp = {
            'name': 'Executive',
            'email': 'exec@bigco.com',
            'company': 'BigCo',
            'title': 'VP of Engineering'
        }
        
        result = scorer.score_lead(lead_vp)
        
        # Should have points from company and VP title
        breakdown_points = [item['points'] for item in result.breakdown]
        assert 30 in breakdown_points  # VP points
    
    def test_negative_scoring(self, scorer):
        """Test that negative rules reduce score."""
        test_lead = {
            'name': 'Test User',
            'email': 'test@test.com',
            'company': 'Test Company'
        }
        
        result = scorer.score_lead(test_lead)
        
        # Should have negative points from test patterns
        has_negative = any(
            item['points'] < 0 for item in result.breakdown
        )
        assert has_negative
    
    def test_unsubscribed_tag_penalty(self, scorer):
        """Test unsubscribed tag gives major penalty."""
        lead = {
            'name': 'Former Customer',
            'email': 'former@company.com',
            'company': 'Company',
            'tags': 'unsubscribed'
        }
        
        result = scorer.score_lead(lead)
        
        # Should have -100 from unsubscribed
        breakdown_dict = {item['rule']: item['points'] for item in result.breakdown}
        assert any(p == -100 for p in breakdown_dict.values())
    
    def test_category_hot(self, custom_scorer):
        """Test hot category assignment."""
        lead = {
            'name': 'VIP Lead',
            'company': 'Enterprise Co',
            'email': 'vip@enterprise.com',
            'tags': 'vip'
        }
        
        result = custom_scorer.score_lead(lead)
        assert result.category == ScoreCategory.HOT
    
    def test_category_cold(self, scorer):
        """Test cold category for low-value lead."""
        lead = {
            'name': 'Cold Lead',
            'email': 'cold@gmail.com'
        }
        
        result = scorer.score_lead(lead)
        assert result.category == ScoreCategory.COLD
    
    def test_score_bounded(self, scorer):
        """Test score is bounded between 0 and max_score."""
        # Create lead that would have very negative score
        bad_lead = {
            'email': 'test@test.com',
            'tags': 'unsubscribed,competitor'
        }
        
        result = scorer.score_lead(bad_lead)
        assert result.score >= 0
        assert result.score <= scorer.max_score
    
    def test_normalized_score(self, scorer):
        """Test normalized score is between 0 and 100."""
        lead = {'name': 'Test', 'company': 'Company'}
        result = scorer.score_lead(lead)
        
        assert 0 <= result.normalized_score <= 100
    
    def test_result_to_dict(self, scorer):
        """Test result serialization."""
        lead = {'name': 'Test', 'company': 'Company'}
        result = scorer.score_lead(lead)
        result_dict = result.to_dict()
        
        assert 'score' in result_dict
        assert 'category' in result_dict
        assert 'breakdown' in result_dict


class TestBatchScoring:
    """Test batch scoring functionality."""
    
    @pytest.fixture
    def scorer(self):
        return LeadScorer()
    
    @pytest.fixture
    def leads(self):
        return [
            {'name': 'Lead 1', 'email': 'lead1@company.com', 'company': 'Company A'},
            {'name': 'Lead 2', 'email': 'lead2@gmail.com'},
            {'name': 'Lead 3', 'email': 'lead3@enterprise.io', 'company': 'Enterprise', 'tags': 'enterprise'}
        ]
    
    def test_batch_scoring_adds_fields(self, scorer, leads):
        """Test batch scoring adds score fields to leads."""
        scored = scorer.score_leads_batch(leads)
        
        for lead in scored:
            assert 'score' in lead
            assert 'score_category' in lead
            assert 'score_breakdown' in lead
    
    def test_batch_preserves_original_data(self, scorer, leads):
        """Test batch scoring preserves original lead data."""
        scored = scorer.score_leads_batch(leads)
        
        for i, scored_lead in enumerate(scored):
            assert scored_lead['name'] == leads[i]['name']
            assert scored_lead['email'] == leads[i]['email']
    
    def test_summary_stats(self, scorer, leads):
        """Test summary statistics calculation."""
        scored = scorer.score_leads_batch(leads)
        stats = scorer.get_summary_stats(scored)
        
        assert stats['total'] == 3
        assert 'hot' in stats
        assert 'warm' in stats
        assert 'cold' in stats
        assert 'avg_score' in stats


class TestFromJson:
    """Test loading scorer from JSON configuration."""
    
    def test_load_from_json(self):
        """Test loading configuration from JSON file."""
        config = {
            'rules': [
                {'field': 'company', 'condition': 'exists', 'value': None, 'points': 25}
            ],
            'thresholds': {'hot': 80, 'warm': 50, 'cold': 0},
            'max_score': 150
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(config, f)
            temp_path = f.name
        
        try:
            scorer = LeadScorer.from_json(temp_path)
            
            assert len(scorer.rules) == 1
            assert scorer.thresholds['hot'] == 80
            assert scorer.max_score == 150
        finally:
            Path(temp_path).unlink()


class TestConditions:
    """Test various condition types."""
    
    @pytest.fixture
    def scorer_with_all_conditions(self):
        rules = [
            ScoringRule(field='status', condition='equals', value='active', points=10),
            ScoringRule(field='status', condition='not_equals', value='churned', points=5),
            ScoringRule(field='note', condition='regex', value=r'\d{3}-\d{4}', points=15),
            ScoringRule(field='revenue', condition='greater_than', value=1000, points=20),
            ScoringRule(field='employees', condition='less_than', value=50, points=10),
            ScoringRule(field='tier', condition='in_list', value=['gold', 'platinum'], points=25),
        ]
        return LeadScorer(rules=rules)
    
    def test_equals_condition(self, scorer_with_all_conditions):
        lead = {'status': 'active'}
        result = scorer_with_all_conditions.score_lead(lead)
        assert any(item['points'] == 10 for item in result.breakdown)
    
    def test_regex_condition(self, scorer_with_all_conditions):
        lead = {'note': 'Call at 555-1234'}
        result = scorer_with_all_conditions.score_lead(lead)
        assert any(item['points'] == 15 for item in result.breakdown)
    
    def test_greater_than_condition(self, scorer_with_all_conditions):
        lead = {'revenue': 5000}
        result = scorer_with_all_conditions.score_lead(lead)
        assert any(item['points'] == 20 for item in result.breakdown)
    
    def test_in_list_condition(self, scorer_with_all_conditions):
        lead = {'tier': 'gold'}
        result = scorer_with_all_conditions.score_lead(lead)
        assert any(item['points'] == 25 for item in result.breakdown)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

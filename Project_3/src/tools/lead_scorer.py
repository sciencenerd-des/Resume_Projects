"""
Lead Scoring Module for Marketing Automation Agent

Provides configurable lead scoring based on attributes and behaviors.
Supports explicit scoring (company, role) and implicit scoring (engagement).
Includes negative scoring for undesirable attributes and score normalization.
"""

import re
import json
from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
from enum import Enum


class ScoreCategory(Enum):
    """Lead quality categories based on score."""
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"


@dataclass
class ScoringRule:
    """
    A single scoring rule configuration.
    
    Attributes:
        field: The lead field to check (e.g., 'company', 'email', 'tags')
        condition: The condition type ('equals', 'contains', 'not_contains', 
                   'regex', 'exists', 'not_exists', 'greater_than', 'less_than')
        value: The value to compare against (None for exists/not_exists)
        points: Points to add (positive) or subtract (negative)
        description: Human-readable description of the rule
    """
    field: str
    condition: str
    value: Any
    points: int
    description: str = ""
    
    def __post_init__(self):
        valid_conditions = [
            'equals', 'not_equals', 'contains', 'not_contains',
            'regex', 'exists', 'not_exists', 'greater_than', 'less_than',
            'in_list', 'not_in_list'
        ]
        if self.condition not in valid_conditions:
            raise ValueError(f"Invalid condition: {self.condition}. Must be one of {valid_conditions}")


@dataclass
class ScoringResult:
    """Result of scoring a single lead."""
    score: int
    category: ScoreCategory
    breakdown: List[Dict[str, Any]] = field(default_factory=list)
    normalized_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'score': self.score,
            'category': self.category.value,
            'normalized_score': self.normalized_score,
            'breakdown': self.breakdown
        }


class LeadScorer:
    """
    Configurable lead scoring engine.
    
    Applies a set of rules to leads to calculate a score and category.
    Supports loading rules from JSON configuration files.
    
    Attributes:
        rules: List of ScoringRule objects
        thresholds: Dict mapping category names to minimum scores
        max_score: Maximum possible score for normalization
    """
    
    DEFAULT_THRESHOLDS = {
        'hot': 70,
        'warm': 40,
        'cold': 0
    }
    
    def __init__(
        self,
        rules: Optional[List[ScoringRule]] = None,
        thresholds: Optional[Dict[str, int]] = None,
        max_score: int = 100
    ):
        """
        Initialize lead scorer.
        
        Args:
            rules: List of scoring rules to apply
            thresholds: Score thresholds for categories
            max_score: Maximum score for normalization
        """
        self.rules = rules or self._default_rules()
        self.thresholds = thresholds or self.DEFAULT_THRESHOLDS
        self.max_score = max_score
    
    @staticmethod
    def _default_rules() -> List[ScoringRule]:
        """Return sensible default scoring rules."""
        return [
            # Explicit scoring - Company/Role indicators
            ScoringRule(
                field='company',
                condition='exists',
                value=None,
                points=20,
                description='Has company information'
            ),
            ScoringRule(
                field='title',
                condition='contains',
                value='Director',
                points=25,
                description='Director-level title'
            ),
            ScoringRule(
                field='title',
                condition='contains',
                value='VP',
                points=30,
                description='VP-level title'
            ),
            ScoringRule(
                field='title',
                condition='contains',
                value='Manager',
                points=15,
                description='Manager-level title'
            ),
            
            # Email quality indicators
            ScoringRule(
                field='email',
                condition='not_contains',
                value='gmail.com',
                points=10,
                description='Business email (not Gmail)'
            ),
            ScoringRule(
                field='email',
                condition='not_contains',
                value='yahoo.com',
                points=10,
                description='Business email (not Yahoo)'
            ),
            ScoringRule(
                field='email',
                condition='not_contains',
                value='hotmail.com',
                points=10,
                description='Business email (not Hotmail)'
            ),
            
            # Tags/Intent signals
            ScoringRule(
                field='tags',
                condition='contains',
                value='enterprise',
                points=30,
                description='Enterprise tag present'
            ),
            ScoringRule(
                field='tags',
                condition='contains',
                value='demo_requested',
                points=25,
                description='Requested demo'
            ),
            ScoringRule(
                field='tags',
                condition='contains',
                value='pricing',
                points=20,
                description='Interested in pricing'
            ),
            
            # Negative scoring
            ScoringRule(
                field='email',
                condition='contains',
                value='test@',
                points=-50,
                description='Test email address'
            ),
            ScoringRule(
                field='company',
                condition='contains',
                value='test',
                points=-20,
                description='Test company name'
            ),
            ScoringRule(
                field='tags',
                condition='contains',
                value='unsubscribed',
                points=-100,
                description='Previously unsubscribed'
            ),
        ]
    
    @classmethod
    def from_json(cls, json_path: str) -> 'LeadScorer':
        """
        Load scorer configuration from JSON file.
        
        Args:
            json_path: Path to JSON configuration file
        
        Returns:
            Configured LeadScorer instance
        """
        with open(json_path, 'r') as f:
            config = json.load(f)
        
        rules = [
            ScoringRule(
                field=r['field'],
                condition=r['condition'],
                value=r.get('value'),
                points=r['points'],
                description=r.get('description', '')
            )
            for r in config.get('rules', [])
        ]
        
        thresholds = config.get('thresholds', cls.DEFAULT_THRESHOLDS)
        max_score = config.get('max_score', 100)
        
        return cls(rules=rules, thresholds=thresholds, max_score=max_score)
    
    def _check_condition(self, lead: Dict[str, Any], rule: ScoringRule) -> bool:
        """
        Check if a lead matches a rule condition.
        
        Args:
            lead: Lead dictionary
            rule: Rule to check
        
        Returns:
            True if condition is met
        """
        field_value = lead.get(rule.field)
        
        if rule.condition == 'exists':
            return field_value is not None and field_value != ''
        
        if rule.condition == 'not_exists':
            return field_value is None or field_value == ''
        
        if field_value is None:
            return False
        
        # Convert to string for text-based conditions
        field_str = str(field_value).lower()
        value_str = str(rule.value).lower() if rule.value else ''
        
        if rule.condition == 'equals':
            return field_str == value_str
        
        if rule.condition == 'not_equals':
            return field_str != value_str
        
        if rule.condition == 'contains':
            return value_str in field_str
        
        if rule.condition == 'not_contains':
            return value_str not in field_str
        
        if rule.condition == 'regex':
            try:
                return bool(re.search(rule.value, field_str, re.IGNORECASE))
            except re.error:
                return False
        
        if rule.condition == 'greater_than':
            try:
                return float(field_value) > float(rule.value)
            except (ValueError, TypeError):
                return False
        
        if rule.condition == 'less_than':
            try:
                return float(field_value) < float(rule.value)
            except (ValueError, TypeError):
                return False
        
        if rule.condition == 'in_list':
            if isinstance(rule.value, list):
                return field_str in [str(v).lower() for v in rule.value]
            return False
        
        if rule.condition == 'not_in_list':
            if isinstance(rule.value, list):
                return field_str not in [str(v).lower() for v in rule.value]
            return True
        
        return False
    
    def _get_category(self, score: int) -> ScoreCategory:
        """
        Determine lead category based on score.
        
        Args:
            score: Raw score value
        
        Returns:
            ScoreCategory enum value
        """
        if score >= self.thresholds.get('hot', 70):
            return ScoreCategory.HOT
        elif score >= self.thresholds.get('warm', 40):
            return ScoreCategory.WARM
        else:
            return ScoreCategory.COLD
    
    def score_lead(self, lead: Dict[str, Any]) -> ScoringResult:
        """
        Score a single lead based on configured rules.
        
        Args:
            lead: Dictionary containing lead data
        
        Returns:
            ScoringResult with score, category, and breakdown
        """
        total_score = 0
        breakdown = []
        
        for rule in self.rules:
            if self._check_condition(lead, rule):
                total_score += rule.points
                breakdown.append({
                    'rule': rule.description or f"{rule.field} {rule.condition} {rule.value}",
                    'points': rule.points,
                    'field': rule.field
                })
        
        # Ensure score is within bounds
        total_score = max(0, min(total_score, self.max_score))
        
        # Normalize to 0-100 scale
        normalized = (total_score / self.max_score) * 100 if self.max_score > 0 else 0
        
        category = self._get_category(total_score)
        
        return ScoringResult(
            score=total_score,
            category=category,
            breakdown=breakdown,
            normalized_score=normalized
        )
    
    def score_leads_batch(self, leads: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Score multiple leads and add scoring data to each.
        
        Args:
            leads: List of lead dictionaries
        
        Returns:
            Same leads with 'score', 'score_category', and 'score_breakdown' added
        """
        scored_leads = []
        
        for lead in leads:
            result = self.score_lead(lead)
            scored_lead = lead.copy()
            scored_lead['score'] = result.score
            scored_lead['score_category'] = result.category.value
            scored_lead['score_breakdown'] = result.breakdown
            scored_lead['normalized_score'] = result.normalized_score
            scored_leads.append(scored_lead)
        
        return scored_leads
    
    def get_summary_stats(self, scored_leads: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate summary statistics for scored leads.
        
        Args:
            scored_leads: List of leads with scores
        
        Returns:
            Dictionary with category counts and score statistics
        """
        if not scored_leads:
            return {'total': 0, 'hot': 0, 'warm': 0, 'cold': 0}
        
        categories = [l.get('score_category', 'cold') for l in scored_leads]
        scores = [l.get('score', 0) for l in scored_leads]
        
        return {
            'total': len(scored_leads),
            'hot': categories.count('hot'),
            'warm': categories.count('warm'),
            'cold': categories.count('cold'),
            'avg_score': sum(scores) / len(scores),
            'max_score': max(scores),
            'min_score': min(scores)
        }


def main():
    """Demo the lead scoring module."""
    print("=" * 60)
    print("LEAD SCORING DEMO")
    print("=" * 60)
    
    # Sample leads
    leads = [
        {
            'name': 'John Smith',
            'email': 'john.smith@acme.com',
            'company': 'Acme Corp',
            'title': 'VP of Engineering',
            'tags': 'enterprise,demo_requested'
        },
        {
            'name': 'Jane Doe',
            'email': 'jane.doe@gmail.com',
            'company': '',
            'title': 'Developer',
            'tags': ''
        },
        {
            'name': 'Bob Wilson',
            'email': 'bob@bigtech.io',
            'company': 'BigTech Inc',
            'title': 'Director of Product',
            'tags': 'pricing,enterprise'
        },
        {
            'name': 'Test User',
            'email': 'test@test.com',
            'company': 'Test Company',
            'title': 'Tester',
            'tags': 'unsubscribed'
        }
    ]
    
    # Initialize scorer
    scorer = LeadScorer()
    
    print("\n📊 Scoring Leads...\n")
    
    # Score each lead
    for lead in leads:
        result = scorer.score_lead(lead)
        
        icon = "🔥" if result.category == ScoreCategory.HOT else (
            "☀️" if result.category == ScoreCategory.WARM else "❄️"
        )
        
        print(f"{icon} {lead['name']}")
        print(f"   Email: {lead['email']}")
        print(f"   Score: {result.score} ({result.category.value.upper()})")
        print(f"   Breakdown:")
        for item in result.breakdown:
            sign = "+" if item['points'] > 0 else ""
            print(f"     {sign}{item['points']}: {item['rule']}")
        print()
    
    # Batch scoring
    scored_leads = scorer.score_leads_batch(leads)
    stats = scorer.get_summary_stats(scored_leads)
    
    print("=" * 60)
    print("SUMMARY STATISTICS")
    print("=" * 60)
    print(f"Total Leads: {stats['total']}")
    print(f"🔥 Hot: {stats['hot']}")
    print(f"☀️ Warm: {stats['warm']}")
    print(f"❄️ Cold: {stats['cold']}")
    print(f"Average Score: {stats['avg_score']:.1f}")
    print(f"Score Range: {stats['min_score']} - {stats['max_score']}")


if __name__ == '__main__':
    main()

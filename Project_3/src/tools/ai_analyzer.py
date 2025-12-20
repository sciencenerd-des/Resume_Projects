"""
AI Lead Analyzer Tool for Marketing Automation Agent.

Uses OpenAI to provide AI-powered lead analysis including:
- Lead quality classification (hot/warm/cold)
- Intent signal extraction
- Personalized outreach suggestions
"""

import json
import os
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class AIAnalysisResult:
    """Result of AI lead analysis."""
    quality: str  # 'hot', 'warm', 'cold'
    confidence: float  # 0.0 to 1.0
    intent_signals: List[str] = field(default_factory=list)
    suggested_action: str = ""
    reasoning: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'quality': self.quality,
            'confidence': self.confidence,
            'intent_signals': self.intent_signals,
            'suggested_action': self.suggested_action,
            'reasoning': self.reasoning
        }


class AILeadAnalyzer:
    """
    AI-powered lead analysis using OpenAI.
    
    Provides intelligent lead classification and insights
    that go beyond rule-based scoring.
    """
    
    CLASSIFICATION_PROMPT = """You are a sales intelligence AI analyzing leads for a B2B SaaS company.
    
Analyze the following lead and provide:
1. Quality classification: 'hot' (ready to buy), 'warm' (interested), or 'cold' (low priority)
2. Confidence score: 0.0 to 1.0
3. Intent signals: List of buying signals detected
4. Suggested action: What the sales team should do next
5. Reasoning: Brief explanation of your classification

Lead Information:
{lead_info}

Respond ONLY with valid JSON in this exact format:
{{
    "quality": "hot|warm|cold",
    "confidence": 0.0-1.0,
    "intent_signals": ["signal1", "signal2"],
    "suggested_action": "action description",
    "reasoning": "brief explanation"
}}"""

    def __init__(self, openai_client=None, model: str = "gpt-4o-mini"):
        """
        Initialize AI analyzer.
        
        Args:
            openai_client: OpenAI client instance (optional, will create if not provided)
            model: Model to use for classification
        """
        self.client = openai_client
        self.model = model
        self._initialized = False
        
        if self.client is None:
            self._try_init_client()
    
    def _try_init_client(self):
        """Try to initialize OpenAI client."""
        try:
            from openai import OpenAI
            api_key = os.getenv("OPENAI_API_KEY")
            if api_key:
                self.client = OpenAI(api_key=api_key)
                self._initialized = True
        except ImportError:
            pass
    
    @property
    def is_available(self) -> bool:
        """Check if AI analysis is available."""
        return self.client is not None
    
    def _format_lead_info(self, lead: Dict[str, Any]) -> str:
        """Format lead data for the prompt."""
        lines = []
        
        # Core fields
        if lead.get('name'):
            lines.append(f"Name: {lead['name']}")
        if lead.get('email'):
            lines.append(f"Email: {lead['email']}")
        if lead.get('company'):
            lines.append(f"Company: {lead['company']}")
        if lead.get('title'):
            lines.append(f"Title: {lead['title']}")
        
        # Additional context
        if lead.get('tags'):
            lines.append(f"Tags: {lead['tags']}")
        if lead.get('source'):
            lines.append(f"Source: {lead['source']}")
        if lead.get('notes'):
            lines.append(f"Notes: {lead['notes']}")
        
        # Include score if available
        if lead.get('score'):
            lines.append(f"Lead Score: {lead['score']}")
        if lead.get('score_category'):
            lines.append(f"Score Category: {lead['score_category']}")
        
        return "\n".join(lines) if lines else "No lead information provided"
    
    def classify_lead(self, lead: Dict[str, Any]) -> AIAnalysisResult:
        """
        Classify a single lead using AI.
        
        Args:
            lead: Lead dictionary with contact information
            
        Returns:
            AIAnalysisResult with classification and insights
        """
        if not self.is_available:
            return AIAnalysisResult(
                quality='unknown',
                confidence=0.0,
                reasoning='AI analysis unavailable (no OpenAI API key)'
            )
        
        lead_info = self._format_lead_info(lead)
        prompt = self.CLASSIFICATION_PROMPT.format(lead_info=lead_info)
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a sales intelligence AI. Respond only with valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent classification
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Parse JSON response
            try:
                result = json.loads(content)
                return AIAnalysisResult(
                    quality=result.get('quality', 'warm'),
                    confidence=float(result.get('confidence', 0.5)),
                    intent_signals=result.get('intent_signals', []),
                    suggested_action=result.get('suggested_action', ''),
                    reasoning=result.get('reasoning', '')
                )
            except json.JSONDecodeError:
                # Try to extract from malformed JSON
                return AIAnalysisResult(
                    quality='warm',
                    confidence=0.5,
                    reasoning=f'Failed to parse AI response: {content[:100]}'
                )
                
        except Exception as e:
            return AIAnalysisResult(
                quality='unknown',
                confidence=0.0,
                reasoning=f'AI analysis error: {str(e)}'
            )
    
    def classify_leads_batch(
        self,
        leads: List[Dict[str, Any]],
        max_concurrent: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Classify multiple leads with AI.
        
        Args:
            leads: List of lead dictionaries
            max_concurrent: Maximum concurrent API calls (not implemented yet)
            
        Returns:
            Leads with 'ai_analysis' field added
        """
        analyzed_leads = []
        
        for lead in leads:
            result = self.classify_lead(lead)
            
            lead_with_analysis = lead.copy()
            lead_with_analysis['ai_analysis'] = result.to_dict()
            lead_with_analysis['ai_quality'] = result.quality
            lead_with_analysis['ai_confidence'] = result.confidence
            
            analyzed_leads.append(lead_with_analysis)
        
        return analyzed_leads
    
    def generate_outreach_suggestion(
        self,
        lead: Dict[str, Any],
        tone: str = "professional"
    ) -> str:
        """
        Generate a personalized outreach suggestion for a lead.
        
        Args:
            lead: Lead dictionary
            tone: Tone of the suggestion ('professional', 'friendly', 'urgent')
            
        Returns:
            Suggested outreach message or approach
        """
        if not self.is_available:
            return "AI outreach suggestions unavailable"
        
        lead_info = self._format_lead_info(lead)
        
        prompt = f"""Based on this lead information, suggest a brief personalized outreach approach.
Tone: {tone}

Lead Information:
{lead_info}

Provide a 2-3 sentence suggestion for how to approach this lead, including:
- A hook that would resonate with them
- Key value proposition to emphasize
- Suggested next step

Keep it concise and actionable."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            return f"Unable to generate suggestion: {str(e)}"


def main():
    """Demo the AI lead analyzer."""
    print("=" * 60)
    print("AI LEAD ANALYZER DEMO")
    print("=" * 60)
    
    # Check if OpenAI is available
    analyzer = AILeadAnalyzer()
    
    if not analyzer.is_available:
        print("\n⚠️  OpenAI API not available.")
        print("Set OPENAI_API_KEY environment variable to enable AI analysis.")
        print("\nShowing mock analysis instead...\n")
        
        # Show mock analysis
        sample_lead = {
            'name': 'John Smith',
            'email': 'john.smith@enterprise.com',
            'company': 'Enterprise Corp',
            'title': 'VP of Engineering',
            'tags': 'enterprise,demo_requested'
        }
        
        print(f"Lead: {sample_lead['name']}")
        print(f"Company: {sample_lead['company']}")
        print(f"Title: {sample_lead['title']}")
        print("\nMock AI Analysis:")
        print("  Quality: hot")
        print("  Confidence: 0.85")
        print("  Intent Signals: ['demo_requested', 'VP-level decision maker', 'enterprise company']")
        print("  Suggested Action: Schedule discovery call within 24 hours")
        return
    
    # Real analysis
    sample_leads = [
        {
            'name': 'Sarah Johnson',
            'email': 'sarah@techstartup.io',
            'company': 'TechStartup',
            'title': 'CEO',
            'tags': 'pricing,enterprise'
        },
        {
            'name': 'Mike Brown',
            'email': 'mike@gmail.com',
            'title': 'Student',
            'tags': ''
        }
    ]
    
    print("\n🤖 Analyzing leads with AI...\n")
    
    for lead in sample_leads:
        result = analyzer.classify_lead(lead)
        
        icon = "🔥" if result.quality == 'hot' else (
            "☀️" if result.quality == 'warm' else "❄️"
        )
        
        print(f"{icon} {lead['name']}")
        print(f"   Company: {lead.get('company', 'N/A')}")
        print(f"   AI Quality: {result.quality} (confidence: {result.confidence:.0%})")
        print(f"   Intent Signals: {', '.join(result.intent_signals) or 'None detected'}")
        print(f"   Suggested Action: {result.suggested_action}")
        print(f"   Reasoning: {result.reasoning}")
        print()


if __name__ == '__main__':
    main()

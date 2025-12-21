"""Orchestrator Agent for OpenAI Agents SDK.

Main coordinator agent that manages the complete lead processing pipeline by delegating
to specialized agents through handoffs.

Pipeline Flow:
1. Email Validator → Validate email addresses
2. Lead Scorer → Score and categorize leads
3. AI Analyzer → Optional AI-powered insights (if enabled)
4. Notion Syncer → Sync to CRM
5. Report Generator → Create summary reports
6. Slack Notifier → Send notifications (if enabled)
"""

from typing import Optional, List, Dict, Any

# OpenAI Agents SDK (requires Python 3.10+)
# The package is installed as `openai-agents` but imports as `agents`
from agents import Agent, handoff, ModelSettings, Runner

# Import SDK configuration
from ..sdk_config import SDKConfig
from ..utils.feature_flags import FeatureFlags

# Import all specialized agents
from .email_validator import create_email_validator_agent
from .lead_scorer import create_lead_scorer_agent
from .ai_analyzer import create_ai_analyzer_agent
from .notion_syncer import create_notion_syncer_agent
from .report_generator import create_report_generator_agent
from .slack_notifier import create_slack_notifier_agent


class OrchestratorAgent:
    """
    Main orchestrator for multi-agent lead processing pipeline.

    Coordinates specialized agents to process leads through the complete workflow.
    Supports both batch CSV processing and conversational interactions.
    """

    def __init__(
        self,
        verbose: bool = False,
        notify_slack: bool = True,
        custom_config: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize the Orchestrator agent with all specialized agents.

        Args:
            verbose: Enable verbose logging
            notify_slack: Whether to send Slack notifications (respects DISABLE_SLACK flag)
            custom_config: Optional custom configuration overrides
        """
        self.verbose = verbose
        self.notify_slack = notify_slack and FeatureFlags.is_slack_enabled()
        self.custom_config = custom_config or {}

        # Create all specialized agents
        self._create_specialized_agents()

        # Create the orchestrator agent with handoffs
        self._create_orchestrator()

        if self.verbose:
            print("[Orchestrator] Initialized with all specialized agents")
            print(f"[Orchestrator] AI Analysis: {'Enabled' if FeatureFlags.is_ai_analysis_enabled() else 'Disabled'}")
            print(f"[Orchestrator] Slack Notifications: {'Enabled' if self.notify_slack else 'Disabled'}")

    def _create_specialized_agents(self):
        """Create all specialized agent instances."""
        self.email_validator = create_email_validator_agent(
            verbose=self.verbose,
            custom_config=self.custom_config.get("email_validator")
        )

        self.lead_scorer = create_lead_scorer_agent(
            verbose=self.verbose,
            custom_config=self.custom_config.get("lead_scorer")
        )

        # AI Analyzer is optional (feature flag controlled)
        self.ai_analyzer = create_ai_analyzer_agent(
            verbose=self.verbose,
            custom_config=self.custom_config.get("ai_analyzer")
        )

        self.notion_syncer = create_notion_syncer_agent(
            verbose=self.verbose,
            custom_config=self.custom_config.get("notion_syncer")
        )

        self.report_generator = create_report_generator_agent(
            verbose=self.verbose,
            custom_config=self.custom_config.get("report_generator")
        )

        # Slack Notifier is optional (feature flag controlled)
        self.slack_notifier = create_slack_notifier_agent(
            verbose=self.verbose,
            custom_config=self.custom_config.get("slack_notifier")
        ) if self.notify_slack else None

    def _create_orchestrator(self):
        """Create the main orchestrator agent with handoff configuration."""
        # Build handoffs list based on available agents
        # Note: tool_name_override must match ^[a-zA-Z0-9_-]+$ (no spaces or special chars)
        handoffs_list = [
            handoff(self.email_validator, "validate_emails", "Validate email addresses for leads"),
            handoff(self.lead_scorer, "score_leads", "Score leads and categorize as HOT/WARM/COLD"),
            handoff(self.notion_syncer, "sync_to_notion", "Sync validated leads to Notion CRM"),
            handoff(self.report_generator, "generate_report", "Generate formatted reports"),
        ]

        # Add optional handoffs based on feature flags
        if self.ai_analyzer:
            handoffs_list.append(
                handoff(self.ai_analyzer, "analyze_with_ai", "Analyze leads with AI for advanced insights")
            )

        if self.slack_notifier:
            handoffs_list.append(
                handoff(self.slack_notifier, "send_slack_notification", "Send Slack notifications")
            )

        # Get orchestrator preset
        config = SDKConfig.get_agent_preset("orchestrator")
        if self.custom_config.get("orchestrator"):
            config.update(self.custom_config["orchestrator"])

        # Create orchestrator agent
        self.agent = Agent(
            name="Lead Processing Orchestrator",

            instructions=config.get("instructions", """You are the Lead Processing Orchestrator, the main coordinator of the lead processing pipeline.

Your role is to manage the complete workflow by delegating tasks to specialized agents through handoffs.

**Complete Pipeline:**

1. **Email Validation** (Required)
   - Hand off to Email Validator agent
   - Validates email format, MX records, detects disposable domains
   - Categorizes: valid, invalid, role-based
   - Output: Validated leads ready for scoring

2. **Lead Scoring** (Required)
   - Hand off to Lead Scorer agent
   - Scores based on company, title, email domain, tags
   - Categorizes: HOT (70+), WARM (40-69), COLD (0-39)
   - Output: Scored leads with categories

3. **AI Analysis** (Optional - if ENABLE_AI_ANALYSIS=true)
   - Hand off to AI Analyzer agent
   - AI-powered quality classification
   - Intent signal detection
   - Personalized outreach suggestions
   - Output: AI insights added to leads

4. **Notion CRM Sync** (Required)
   - Hand off to Notion Syncer agent
   - Creates Notion database records
   - Batch processing for efficiency
   - Output: Sync status and Notion page IDs

5. **Report Generation** (Required)
   - Hand off to Report Generator agent
   - Creates formatted terminal reports
   - Generates email summaries
   - Output: Comprehensive processing report

6. **Slack Notification** (Optional - if DISABLE_SLACK not set)
   - Hand off to Slack Notifier agent
   - Sends processing summary
   - Color-coded based on success rate
   - Output: Notification status

**Workflow Coordination:**

- Execute handoffs in sequential order
- Pass context between agents (maintain lead data across pipeline)
- Handle errors gracefully (continue pipeline even if optional steps fail)
- Collect results from each agent
- Provide final summary with all results

**Context Management:**

Maintain these variables across the pipeline:
- `leads`: Current lead data being processed
- `valid_leads`: Leads that passed validation
- `scored_leads`: Leads with scores and categories
- `notion_results`: CRM sync results
- `ai_analyzed_count`: Number of AI-analyzed leads
- `errors`: Cumulative errors from all stages

**Error Handling:**

- Email validation failures: Collect and report, continue with valid leads
- Scoring failures: Unlikely (deterministic), log if occurs
- AI analysis failures: Optional, continue pipeline if fails
- Notion sync failures: Report but don't stop pipeline
- Slack failures: Log but don't fail overall process

**Guidelines:**

- Always complete required steps (validation, scoring, Notion, report)
- Skip optional steps if feature flags disable them
- Provide clear status updates at each handoff
- Maintain data integrity across handoffs
- Return comprehensive final results
- Be efficient - use batch operations where available

**Output Format:**

Final orchestrator output should include:
- Total leads processed
- Valid/invalid breakdown
- Score distribution (HOT/WARM/COLD counts)
- Notion sync status
- AI analysis count (if applicable)
- Generated report text
- Slack notification status (if applicable)
- All errors encountered

You are the conductor of this symphony of specialized agents. Coordinate them smoothly to deliver exceptional lead processing results."""),

            handoffs=handoffs_list,

            model=config.get("model", SDKConfig.DEFAULT_MODEL),
            model_settings=ModelSettings(
                temperature=config.get("temperature", 0.3)
            ),
        )

    def run_pipeline(
        self,
        mode: str = "batch",
        csv_path: Optional[str] = None,
        leads: Optional[List[Dict[str, Any]]] = None,
        message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Run the complete lead processing pipeline.

        Args:
            mode: "batch" for CSV processing, "conversational" for natural language
            csv_path: Path to CSV file (for batch mode)
            leads: Pre-loaded leads list (alternative to csv_path)
            message: Natural language message (for conversational mode)

        Returns:
            Dict with complete pipeline results
        """
        if mode == "batch":
            if csv_path:
                context = f"Process leads from CSV file: {csv_path}"
            elif leads:
                context = f"Process {len(leads)} leads from provided list"
            else:
                raise ValueError("Either csv_path or leads must be provided for batch mode")

            # Run the agent with batch processing context
            result = Runner.run_sync(self.agent, context)

            return self._parse_batch_results(result)

        elif mode == "conversational":
            if not message:
                raise ValueError("Message must be provided for conversational mode")

            # Run the agent with user message
            result = Runner.run_sync(self.agent, message)

            return {
                "mode": "conversational",
                "response": result.message if hasattr(result, 'message') else str(result),
                "status": "completed"
            }

        else:
            raise ValueError(f"Invalid mode: {mode}. Must be 'batch' or 'conversational'")

    def _parse_batch_results(self, result) -> Dict[str, Any]:
        """Parse results from batch pipeline execution.

        Extracts structured data from the agent handoff chain to match
        the legacy format exactly for backward compatibility.

        Args:
            result: Result from self.agent.run()

        Returns:
            Dict in legacy format with all expected fields
        """
        # Initialize with default legacy format
        parsed = {
            "status": "complete",
            "csv_path": "",
            "steps": [],
            "valid_leads": [],
            "invalid_leads": [],
            "validation_errors": [],
            "scored_leads": [],
            "score_stats": {},
            "notion_results": {},
            "report": "",
        }

        try:
            # The SDK agent result contains messages and execution history
            # We need to extract tool call results from the execution chain

            # Check if result has expected attributes
            if hasattr(result, 'messages'):
                # Parse messages to extract tool call results
                for message in result.messages:
                    if hasattr(message, 'tool_calls') and message.tool_calls:
                        # Extract results from tool calls
                        for tool_call in message.tool_calls:
                            self._extract_tool_result(tool_call, parsed)

            # If result has a final_output or return_value attribute
            if hasattr(result, 'final_output'):
                # Some SDKs return structured output here
                if isinstance(result.final_output, dict):
                    parsed.update(result.final_output)

            # Fallback: Try to extract from context if available
            if hasattr(result, 'context') and isinstance(result.context, dict):
                # Extract any stored results from context
                for key in ["csv_path", "valid_leads", "scored_leads", "notion_results", "report"]:
                    if key in result.context:
                        parsed[key] = result.context[key]

            # Build steps array from execution history
            parsed["steps"] = self._build_steps_from_result(result)

        except Exception as e:
            # If parsing fails, return error status
            parsed["status"] = "error"
            parsed["error"] = f"Result parsing failed: {str(e)}"

        return parsed

    def _extract_tool_result(self, tool_call, parsed: Dict[str, Any]):
        """Extract results from a single tool call.

        Args:
            tool_call: Tool call object from SDK
            parsed: Parsed results dict to update
        """
        try:
            # Check if tool_call has result/output
            result_data = None
            if hasattr(tool_call, 'result'):
                result_data = tool_call.result
            elif hasattr(tool_call, 'output'):
                result_data = tool_call.output

            if not result_data:
                return

            # Map tool names to result fields
            tool_name = getattr(tool_call, 'name', '') or getattr(tool_call, 'function', {}).get('name', '')

            if 'validate' in tool_name.lower():
                # Email validation results
                if isinstance(result_data, dict):
                    parsed["valid_leads"] = result_data.get("valid_leads", [])
                    parsed["invalid_leads"] = result_data.get("invalid_leads", [])
                    parsed["validation_errors"] = result_data.get("validation_errors", [])

            elif 'score' in tool_name.lower():
                # Lead scoring results
                if isinstance(result_data, dict):
                    parsed["scored_leads"] = result_data.get("scored_leads", [])
                    parsed["score_stats"] = result_data.get("score_stats", {})

            elif 'notion' in tool_name.lower() or 'sync' in tool_name.lower():
                # Notion sync results
                if isinstance(result_data, dict):
                    parsed["notion_results"] = result_data

            elif 'report' in tool_name.lower():
                # Report generation
                if isinstance(result_data, dict):
                    parsed["report"] = result_data.get("report", "")
                elif isinstance(result_data, str):
                    parsed["report"] = result_data

        except Exception:
            # Silently skip problematic tool results
            pass

    def _build_steps_from_result(self, result) -> List[Dict[str, str]]:
        """Build steps array from SDK result.

        Args:
            result: SDK agent result

        Returns:
            List of step records
        """
        steps = []

        try:
            # If result has messages, track which agents/tools were called
            if hasattr(result, 'messages'):
                for message in result.messages:
                    if hasattr(message, 'tool_calls') and message.tool_calls:
                        for tool_call in message.tool_calls:
                            tool_name = getattr(tool_call, 'name', 'unknown')
                            steps.append({
                                "step": tool_name,
                                "status": "success"
                            })

            # If no steps were extracted, add a generic completion step
            if not steps:
                steps.append({
                    "step": "pipeline",
                    "status": "success"
                })

        except Exception:
            # Fallback to minimal steps
            steps = [{"step": "completed", "status": "success"}]

        return steps


# Factory function for backward compatibility
def create_orchestrator_agent(
    verbose: bool = False,
    notify_slack: bool = True,
    custom_config: Optional[Dict[str, Any]] = None
) -> OrchestratorAgent:
    """
    Create and configure the Orchestrator agent.

    Args:
        verbose: Enable verbose logging
        notify_slack: Whether to send Slack notifications
        custom_config: Optional custom configuration

    Returns:
        Configured OrchestratorAgent instance
    """
    return OrchestratorAgent(
        verbose=verbose,
        notify_slack=notify_slack,
        custom_config=custom_config
    )


# Export
__all__ = ["OrchestratorAgent", "create_orchestrator_agent"]

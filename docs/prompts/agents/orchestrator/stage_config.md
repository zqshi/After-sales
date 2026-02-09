# Orchestrator Stage Config

```prompt
{
  "assistant": {
    "default": "reply",
    "complaint": "handoff",
    "high_risk": "risk_alert",
    "fault": "fault_reply",
    "vip": "vip_reply",
    "clarify": "clarify"
  },
  "engineer": {
    "parallel": ["diagnosis", "severity", "escalation", "report_summary"]
  },
  "inspector": {
    "quality": ["quality_report", "follow_up", "report_summary"]
  }
}
```

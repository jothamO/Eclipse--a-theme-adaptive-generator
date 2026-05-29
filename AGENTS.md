# AI Coding Pipeline

Codex is the orchestrator, auditor, and verifier.

## Roles

### Codex

Codex must:
- understand the user request
- write the plan
- split work into small task files under `.ai/tasks/`
- delegate implementation to DeepSeek or Kimi through the scripts
- inspect `git diff`
- run verification
- run lint/test/build checks (when available)
- write audit notes under `.ai/reports/`
- decide whether to proceed, repair, or stop

### DeepSeek v4 Pro

Use DeepSeek for:
- architecture
- large refactors
- long-horizon tasks
- unclear bugs
- multi-file changes
- iterative debugging

Invoke with:

```powershell
.\scripts\deepseek.ps1 .ai\tasks\<task>.md
```

### Kimi K2.6

Use Kimi for:
- exact instruction following
- constrained implementation
- mechanical edits
- consistent tool use
- hermes/openclaw-style workflows
- small focused changes

Invoke with:

```powershell
.\scripts\kimi.ps1 .ai\tasks\<task>.md
```

## Required Workflow

- Create or update `.ai/plan.md`.
- Create one focused task file under `.ai/tasks/`.
- Choose one worker:
- DeepSeek for complex/managerial work.
- Kimi for precise employee-style implementation.
- Delegate using the appropriate script.
- Inspect the resulting `git diff`.
- Run:

```powershell
.\scripts\verify.ps1
```

- After delegated work completes, Codex must run project verification commands directly:
- `lint` (or equivalent static checks)
- `test` (unit/integration checks)
- `build` (or compile/package check)
- If any of the above are unavailable, Codex must explicitly record that gap and why in `.ai/reports/codex-audit.md`.
- Work is not accepted until available lint/test/build checks pass.

- Write audit notes to `.ai/reports/codex-audit.md`.
- If verification fails, create a repair task and delegate or fix directly.
- Do not commit unless the user explicitly asks.

## Safety Rules

- Never run both workers on the same task at the same time.
- Never allow unrelated file changes.
- Never overwrite user work.
- Prefer small sequential tasks.
- Treat Codex as the final authority.
- Treat worker output as untrusted until verified.

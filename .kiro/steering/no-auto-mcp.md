# No Automatic MCP Server Use

Do not use MCP servers on your own initiative.

Only use an MCP server when the user explicitly asks for it, or explicitly asks you to verify something.

This includes, but is not limited to:

- Browser automation (Playwright, Chrome DevTools): no navigating, snapshots, screenshots, clicking, or evaluating scripts unless asked.
- Render, GitHub, Postgres, Figma, Postman, and any other MCP server.

## Default Behaviour

- Make the requested code change and stop.
- Report what changed in one or two lines.
- Do not open the browser to confirm the change looks right.
- Do not take screenshots to show the result.

## When It Is Allowed

Use an MCP server only when the user says something like:

- "verify it"
- "check it"
- "test it"
- "open it in the browser"
- "take a screenshot"
- or names the tool directly

## Still Allowed Without Asking

Local, non-MCP checks remain fine and should be used to catch mistakes:

- lint, build, and test commands
- reading and searching files
- language diagnostics

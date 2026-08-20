# Minimal Code Changes

## Core Rule

Always make the smallest possible change required to complete the user's request.

## Do NOT Add Unnecessary Code

- Do not add features that were not requested.
- Do not create extra classes, interfaces, services, utilities, hooks, components, or files unless required.
- Do not refactor existing code unless explicitly requested.
- Do not rewrite working code just to improve its style.
- Do not add comments unless they explain genuinely non-obvious logic.
- Do not add unnecessary error handling, validation, logging, abstractions, or configuration.
- Do not add dependencies unless absolutely required.
- Do not duplicate existing functionality.
- Before creating something new, check whether an existing function, component, service, utility, or dependency can be reused.

## Before Editing

1. Inspect the existing implementation.
2. Identify the exact files and lines that need to change.
3. Reuse the existing architecture and patterns.
4. Make the minimum changes necessary.

## After Editing

- Remove any code that is not required for the requested functionality.
- Do not modify unrelated files.
- Do not change existing behavior outside the requested change.
- Keep the implementation simple and consistent with the existing project.

## Important

If the requested feature can be implemented by modifying 1 existing file, do not create 3 new files.

If there are multiple valid approaches, prefer the simplest approach with the fewest changes.

Do not "improve" unrelated code unless explicitly asked.

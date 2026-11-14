# ADR-002: Separate feature behaviour from presentation

Status: Accepted for the income-tax wizard; migrate other features individually.
Date: 2026-10-16

## Decision

Keep the existing React application and backend. Give each feature its own rules,
contracts and controllers. Presentation imports these; feature code must not
import presentation. This is an internal code separation, not a separate service.

For the first feature:

```text
client/src/features/income-tax/
  model.ts                     Input types, defaults and calculation functions
  validation.ts                Input acceptance rules
  flow.ts                      Step selection and continuation rules
  resultExport.ts              Existing PDF and AI payload contracts
  useIncomeTaxWizard.ts         State and navigation actions
  useBasicDetailsAutofill.ts    Account autofill lifecycle
  useIncomeTaxResult.ts         Auth-aware result actions and effects

client/src/components/calculators/tax-wizard/
  TaxWizard.tsx                Layout, screen selection and scroll behaviour
  steps/*.tsx                  Fields, cards, labels, styling and event wiring
```

`shared/` continues to own rules needed by the server and client. Server-only
authentication, authorization and persistence stay on the server. Controllers
may use existing client services/hooks; pure rules must not require React,
browser globals or network access. Small compatibility exports at the old model
and result-export paths avoid breaking callers during migration.

## Working rule

- UI changes edit presentation and design tokens, not calculation or validation rules.
- Feature changes edit rules/controllers and their tests, then wire the results into UI.
- A screen renders feature outputs and dispatches actions; do not reproduce formulas in JSX.
- New feature logic never imports `components/` or `pages/`.
- Test the feature without mounting its screens. Also verify user interactions when
  changing field or button wiring; separation cannot prevent every wiring mistake.

## Verification

`npm run test:income-tax` checks every income-head combination, validation
boundaries, a worked old/new tax fixture, PDF/advice payload values, input
immutability and feature-to-UI import boundaries. It runs inside `npm run build`.
`npm run test:calc` retains the existing shared-engine and legacy-calculator checks.

The new tests protect the migrated wizard; they do not certify every tax rule,
AI response, authentication provider or browser download. Existing calculation
functions were moved without changing their math or state types.

## Alternatives and trade-offs

Leaving logic in screen files makes isolated testing and redesigns harder. A full
application rewrite or separate backend service would add migration risk without
being needed for this boundary. Feature controllers still depend on React and
existing service hooks, while pure calculation and flow modules remain independent.

## Rollout

1. Income-tax wizard: first implementation and regression pattern.
2. Document reconciliation: separate upload/review workflow from document screens.
3. Saved results/dashboard: separate persistence and filtering from cards/tables.
4. Other calculators: migrate one calculator at a time with worked fixtures.

Legacy calculators and other features have not been migrated by this change.
Validate each feature before proceeding to the next; deploy separately when requested.

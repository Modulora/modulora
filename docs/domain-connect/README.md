# Domain Connect template

`modulora.dev.domain-verification.json` is Modulora's Domain Connect template.
It writes a single ownership-proof TXT record:

```
_modulora.<domain>  TXT  modulora-verify=<token>
```

## Why this exists

The settings page offers one-click DNS setup (`discoverDomainConnect` in
`apps/web/src/lib/domains.ts`). That flow follows the Domain Connect spec:
discovery via the `_domainconnect` TXT record, a template-support check
against the DNS provider's API, then a synchronous-flow apply URL where the
user reviews the change at their provider before it is applied.

The one-click panel renders **only** when the user's DNS provider reports
support for this template — which requires the template to be onboarded in
the upstream registry first. Until then users get the manual copy-ready
records table; no fake buttons.

## Onboarding

1. Submit this file as a PR to <https://github.com/Domain-Connect/Templates>
   (filename convention: `modulora.dev.domain-verification.json`).
2. Individual DNS providers (GoDaddy, IONOS, Plesk, …) enable templates from
   the registry on their own schedule.
3. No code changes needed on our side — discovery lights up per provider
   automatically.

The `%code%` variable matches the `code` query parameter built in
`discoverDomainConnect`'s apply URL.

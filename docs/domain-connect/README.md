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

## Online editor test results (2026-07-13)

Required evidence for the upstream PR — both exercise `%code%` replacement
(`tok-a1b2c3d4e5`):

- Apex (`example.com/@`) → `_modulora.example.com. TXT "modulora-verify=tok-a1b2c3d4e5"`
  [test link](https://domainconnect.paulonet.eu/dc/free/templateedit?token=H4sIAC7fVGoC%2F%2BVT227aQBD9FWulPDUG22BwLPWBXCq1EVHUUqkViqxhdwyr2F53d01wUP69sxAuoZHa9z55Lues58xlzSyWdQEWWbpmtVZLKVB%2FFixlpRJNoTR0BC7Z%2BT53ByVh2fg1SxmDeik5bkhClSArf4la5pKDlao6IE6o3hbsnYDJNc5Kw3NWqLn6rgsiLaytTdrtHlfVdelOXc2JJdBwLevNGykbCWE8u0Bv8mPiaeRKC3LBek4FGq9VjcdVZbUqKC7NrpRcaZfT3r5GrhEsRYmYywI7Tk1b8ctC8UeW5lAYpMgCNIq9u%2F2hYel0zWxbO81UBzEXylhysvLQPAEWjpq97Vz78YwrgWeUt5bU9wZBQObKXqkqLyS3Y7B8Ias5lelev9eYyxV7F%2FKa%2B%2FMX7OVhq%2BW%2Bmd1ie73pwOncX87Zs6owO0gikthBcQW0PNjhqjyoI2uuVVNncoevQUNp3ILtmNM31Icdd8qczTeipsyqRx%2FCWcR7oo8xe6Ba5LxSGjNDX7CNJpjVDXW8bAorM3iCQ0jwDOq6aKl0Q1l68HQa1XYd%2F2EaJ5W8mUomuFMm3fbPeJLkYRL6OMi53wcA%2FyLqx%2F4A4ou8F8ziIEqOTum9M%2Fv7MR3ajMZgZSW4%2BxgVT9Aa9kJDpZb%2FJ1LdAsMSRQYOFgXRwA%2BGftibhFEaB2nc7yRJPxlGH4IgDQInBo3dCl%2FTNh3vEfs1%2FnZb3lzehUuAq%2BsvXRENZyO%2B%2BprPb8LqKb6dPH7Kf3YDbcsxnc5vzpDnADgFAAA%3D)
- Subdomain (`example.com/app`) → `_modulora.app.example.com. TXT "modulora-verify=tok-a1b2c3d4e5"`
  [test link](https://domainconnect.paulonet.eu/dc/free/templateedit?token=H4sIAL3fVGoC%2F%2BVT207bQBD9FWslnoqD7VwcLPWBSxGoUJC4CClC1mR3nKxie63ddYiJ%2BPfOxuRCStUP6JM9M%2BfMzpnLklksqhwssmTJKq3mUqC%2BEixhhRJ1rjR0BM7Z4Sb2CwrCspuPKEUM6rnkuCIJVYAs%2FTlqmUkOVqpyi9ijei3Y2wOTadxfEh6yXE3Uo86JNLW2MsnR0W5VRy7cqcoJsQQarmW1ypGwEyGMZ6foPTw%2FeBq50oJMsJ5TgcZrVO1xVVqtcvJLsy4lU9rFtLepkWsES14iZjLHjlPTlPw0V3zGkgxyg%2BSZgkaxMdsHDUtGS2abymmmOog5VcaSkRbb5gmwsNPstnPN9wOuBB5Q3FpS3x0EAf0u7Jkqs1xyewOWT2U5oTJd9juNmVywLyEfsT%2BfYO8vrZa7evwTm%2FNVB%2Fbn%2Fn7I3lSJ6VYSkcQaigug5cEOV8VWHVQVGROt6iqVa0oFGgrjdmxNHn1iv6zpoxWfTL6SNmJWzXwIxxHvih722QtVJCel0pga%2BoKtNcGsrqnvRZ1bmcIrbF2Cp5Qvb0iAoSgl3J9J2S7lZiadtv6%2FzGWvmk%2FzSQV3AqW7g4zDcV9w7seDGPxeL4r9IR%2F2%2FV4cBmI4FOEw4DtH9dXB%2FfusPjUcjcHSSnDHcpK%2FQmPYO02Ymv9%2FKXZLDXMUKThkFEQDP4j9sPsQRkm%2Fm4RxZxD3jrvhtyBIgsDpQWNb7Uvard2tYmp83r%2BNrs%2Bzwe1pdHH5fHk3Pnl77F%2BN789ml9c%2F7MXT%2FeLxDK6f5jM6p990b6EkTAUAAA%3D%3D)

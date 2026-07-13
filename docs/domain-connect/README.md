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
  [test link](https://domainconnect.paulonet.eu/dc/free/templateedit?token=H4sIANLkVGoC%2F%2BVTyW7bMBD9FYFATrFsyZI3AT2kC9AtrdO6RVsjEMbk2CYiiSpJOVaN%2FHuHVrw2RT%2BgJ2mWN3xvlg2zmJcZWGTJhpVaraRA%2FUawhOVKVJnS0Ba4Yq197APklMuuH6MUMahXkuMWJFQOsvBXqOVccrBSFYeMM6jXJHtnyWQa95eELZaphfqiMwItrS1N0ukcs%2Bq4cLssFoQSaLiW5bZGwq6EMJ5dojf5NvE0cqUFmWA9pwKNV6vK46qwWmXkl2ZHZa60i2lvz5FrBEteAs5lhm2npi7480zxO5bMITNIniVoFHuzedCwZLphti6dZuJByKUylow0PzRPgIWjZjedq59dcCXwguLWkvqoHwT0u7YvVDHPJLfXYPlSFgui6aqPNc7lmj2Z8hj78wn2cNtoGVezd1i%2F3HbgfO4PLfZLFZgeJBFI7FJxDbQ82OYqP6iDsiRjoVVVpnIHKUFDbtyO7cDTE%2FTtDj7d4snkW2lTZtWdD%2BGsyyMRY4%2FdEiO5KJTG1NAXbKUpzeqK%2Bp5XmZUp3MPBJXhK9bKaBBiKUsHzmRTNUu5n0m74%2F2UuZ2xO5pMK7gRKdwfDUTQYxlHoiwgHfjzDmT%2FsjoTfjwWf9QIe9yE4OqqnDu7fZ3XScDQGCyvBHctVdg%2B1YQ80YWr%2B%2F6XYLTWsUKTgMrtBt%2B8HAz%2BMJmGUhHHSG7bDQW8Ux5dBkASOkUVjG%2B0b2q3jrWKvTXwTmEn%2BKp%2Fx97I3%2Btr7GOlw%2FP2y8%2FnHpFD9n2t4uy7G9ubTPZ3Tb0NRkpRMBQAA)

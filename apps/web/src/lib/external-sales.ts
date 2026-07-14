import { EXTERNAL_DOMAIN_VERIFICATION_REQUIRED } from "./flags";

/** Whether an external destination passes the active alpha ownership gate. */
export function externalDomainAllowed(
  domainVerified: boolean,
  verificationRequired = EXTERNAL_DOMAIN_VERIFICATION_REQUIRED,
): boolean {
  return !verificationRequired || domainVerified;
}

/** Honest, scoped public copy for the latest recorded domain-control check. */
export function externalDomainDisclosure(verifiedAt: string | null): string {
  return verifiedAt
    ? `The creator proved control of the destination domain on ${verifiedAt.slice(0, 10)}.`
    : "Destination-domain control has not been verified during alpha.";
}

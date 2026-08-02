# ArkAdmin Security Policy

## Project Status

ArkAdmin is an experimental project under active development.

The repository currently contains three related applications:

* **ArkAdmin:** An operator control plane for managing balances, VTXOs, refreshes, exits, and claims.
* **ArkPOS:** A point-of-sale interface for receiving payments.
* **ArkFetch:** A payment-processing API that creates charges and dispatches merchant webhooks.

The currently documented deployment target is **Bitcoin Signet**, and the project depends on the alpha-stage `barkd` wallet daemon.

Unless a specific release explicitly states otherwise:

* ArkAdmin has not been independently security audited.
* ArkAdmin is not considered production-ready.
* ArkAdmin should not be used with mainnet funds.
* ArkAdmin should not be treated as the sole recovery mechanism for valuable funds.
* Administrative interfaces and `barkd` should not be exposed directly to the public internet.

Because ArkAdmin can initiate wallet operations and represent payment state, a defect could result in loss of funds, disclosure of sensitive information, unauthorized wallet control, or incorrect payment processing.

## Supported Versions

Security fixes are currently provided only for the active development branch.

| Version or branch                              | Supported |
| ---------------------------------------------- | --------- |
| `main`                                         | Yes       |
| Tagged releases explicitly marked as supported | Yes       |
| Older commits and unsupported releases         | No        |
| Third-party forks and modified deployments     | No        |

Users may be required to upgrade to the latest commit or supported release to receive a security fix.

## Reporting a Vulnerability

Do not open a public GitHub issue, discussion, or pull request containing details of a suspected vulnerability.

Use GitHub's private vulnerability-reporting feature:

1. Open the repository's **Security** tab.
2. Select **Advisories**.
3. Select **Report a vulnerability**.

If private vulnerability reporting is unavailable, open a public issue titled **Security contact requested** without including technical details. The maintainer will provide a private reporting channel.

Please include as much of the following as possible:

* A clear description of the vulnerability.
* The affected application: ArkAdmin, ArkPOS, ArkFetch, or shared infrastructure.
* The affected commit, branch, or release.
* The expected behavior and observed behavior.
* The potential impact.
* Required configuration or attack prerequisites.
* Reproduction steps or a minimal proof of concept.
* Generated Signet test vectors, when relevant.
* Logs with secrets and identifying information removed.
* A suggested mitigation or patch, when available.
* Whether the issue has already been disclosed publicly or exploited.

Never include real seed phrases, private keys, wallet backups, macaroon files, API keys, PINs, database credentials, authentication tokens, or other production secrets in a report.

## Security-Sensitive Issues

When uncertain whether an issue has security implications, report it privately.

### Wallet and Fund Control

Examples include:

* Unauthorized initiation of an L1, Ark, or Lightning payment.
* Unauthorized onboarding, refresh, offboarding, unilateral exit, or claim operations.
* Sending funds to a destination or network different from the one displayed to the user.
* Incorrect amount, fee, invoice, address, or destination validation.
* Duplicate or replayed wallet operations.
* Reporting a wallet operation as failed when it may have succeeded.
* Reporting an operation as successful before authoritative confirmation.
* Incorrect VTXO ownership, spendability, expiry, or lifecycle information.
* Incorrect unilateral-exit timelocks, claim readiness, or recovery status.
* Claiming an exit to an unintended address.
* Treating an invalid or unspendable recovery path as valid.
* Unsafe behavior caused by malformed or malicious responses from `barkd`.
* A discrepancy between ArkAdmin's displayed state and authoritative wallet or chain state that could affect fund safety.

### Authentication and Authorization

Examples include:

* Bypassing an ArkAdmin administrative control.
* Bypassing or guessing the ArkPOS exit PIN.
* Bypassing ArkFetch API-key authentication.
* Accessing another merchant's charges, invoices, metadata, or payment status.
* Invoking privileged Next.js server actions without proper authorization.
* Cross-site request forgery that can trigger a state-changing or fund-moving action.
* Authentication tokens, API keys, PINs, or credentials being exposed in logs, responses, source code, browser storage, or error messages.
* Default, weak, replayable, or improperly stored credentials that create a practical attack.
* Failure to revoke or deactivate an API key.
* Privilege escalation between the public payment interface, POS interface, API, and operator interface.

### Charges and Payment-State Integrity

Examples include:

* Marking a charge as paid without authoritative settlement evidence.
* Failing to recognize a settled payment.
* Associating a payment with the wrong charge.
* Mismatching an invoice, payment hash, amount, or charge identifier.
* Processing the same settlement or fulfillment more than once.
* Allowing an attacker to manipulate the generated hosted-payment URL.
* Exposing payment details or merchant metadata to an unauthorized party.
* Trusting client-provided payment status rather than authoritative wallet state.
* Race conditions that result in incorrect charge or webhook state.

### Webhooks and Background Processing

Examples include:

* Server-side request forgery through a merchant-provided webhook URL.
* Webhook requests reaching localhost, private networks, cloud metadata services, or other protected resources.
* Forged, replayed, or unauthenticated webhook events.
* Disclosure of payment or merchant data through webhook delivery.
* Redirect handling that bypasses webhook destination restrictions.
* Unauthorized invocation of internal cron or background-processing endpoints.
* Repeated processing that causes duplicate merchant fulfillment.
* A webhook being recorded as successfully delivered when it was not.
* Resource exhaustion caused by webhook retries, slow destinations, or untrusted payloads.

### Application and Data Security

Examples include:

* Remote code execution.
* SQL, command, template, or other injection.
* Cross-site scripting with a meaningful security impact.
* Path traversal or arbitrary file access.
* Unauthorized access to the SQLite database or its backups.
* Disclosure or modification of charge, payment, wallet, or merchant data.
* Sensitive environment variables appearing in logs or responses.
* Host-header, forwarded-header, or proxy-trust vulnerabilities.
* Denial of service with a practical impact on wallet access, payment acceptance, recovery, or operator safety.
* Unsafe parsing of invoices, addresses, transaction identifiers, metadata, or daemon responses.
* Dependency, build-system, release, or supply-chain compromise.

This list is illustrative and not exhaustive.

## Issues That May Be Reported Publicly

The following may generally be reported through ordinary GitHub issues when they have no plausible security impact:

* User-interface or accessibility problems.
* Documentation corrections.
* Feature requests.
* Development-environment problems.
* Signet faucet availability.
* Cosmetic display errors that cannot affect operator decisions.
* Requests to support another Ark implementation or protocol version.
* Performance problems that cannot be used to disrupt the service.
* Errors involving configurations explicitly documented as unsupported.

Issues in `bark`, `barkd`, an Ark server, Bitcoin Core, or another upstream dependency should ordinarily be reported to the responsible upstream project. Report the issue to ArkAdmin when its integration introduces or materially increases the security impact.

If a public issue is later determined to contain security-sensitive information, maintainers may hide, edit, lock, or remove it while the issue is investigated.

## Response Process

The project will make a reasonable effort to:

* Acknowledge a private report within five business days.
* Provide an initial assessment within ten business days.
* Confirm whether the issue can be reproduced.
* Identify affected components and versions.
* Keep the reporter informed while a confirmed issue is being addressed.
* Develop a fix or practical mitigation.
* Coordinate disclosure with the reporter and affected upstream projects.
* Publish a GitHub security advisory when appropriate.

These are response targets rather than guaranteed remediation deadlines. Resolution time will depend on severity, complexity, upstream dependencies, and the risk of disclosing the issue before users can protect themselves.

A report may be closed as not applicable when it does not cross a security boundary, requires complete prior control of the host without creating additional impact, or affects only an explicitly unsupported deployment.

## Coordinated Disclosure

Please allow the maintainer a reasonable opportunity to investigate and address a vulnerability before publishing technical details.

Disclosure will normally occur after:

* A fix or mitigation is available.
* Affected users have had a reasonable opportunity to update.
* Any necessary coordination with `bark`, `barkd`, Ark-server, wallet, or dependency maintainers has occurred.

The project may publish limited mitigation guidance before a full fix when users face an immediate risk.

The project may request a CVE through a GitHub repository security advisory when the impact and affected distribution justify one.

## Security Research Guidelines

Researchers should:

* Test only systems and accounts they own or have explicit permission to test.
* Use Bitcoin Signet and generated test data.
* Avoid using meaningful mainnet funds.
* Avoid accessing, modifying, or destroying another person's data or funds.
* Avoid scanning or testing publicly reachable third-party ArkAdmin deployments.
* Avoid persistent denial of service or resource exhaustion.
* Minimize the amount of sensitive data accessed during testing.
* Stop testing and report the issue if continued testing could cause loss of funds or harm.
* Remove secrets and personal information from all reports and test artifacts.
* Comply with applicable laws and the policies of upstream services.

This policy does not authorize testing of third-party systems, Ark servers, wallet daemons, or infrastructure.

## Deployment Safety

Until a release is explicitly documented as production-ready:

* Use ArkAdmin only with Bitcoin Signet.
* Keep ArkAdmin and `barkd` on localhost or a trusted private network.
* Do not expose operator or wallet-control actions directly to the public internet.
* Replace all default credentials, including the default POS PIN.
* Use long, randomly generated API keys.
* Do not commit `.env` files, databases, wallet files, or secrets.
* Treat the SQLite database and its backups as sensitive.
* Protect public deployments with TLS, authentication, network restrictions, and a properly configured reverse proxy.
* Restrict access to cron and background-processing endpoints.
* Restrict outbound webhook access to approved destinations and block private-network address ranges.
* Avoid logging environment variables, credentials, invoices, payment secrets, or sensitive wallet data.
* Keep Node.js, Next.js, Prisma, the Bark client, and other dependencies updated.
* Maintain independent, tested wallet backups and recovery procedures.
* Verify important wallet and payment state against authoritative daemon or chain data.

A security policy provides a reporting process; it does not make an otherwise unsafe deployment secure.

## Bug Bounties

ArkAdmin does not currently operate a paid bug-bounty program.

Submitting a vulnerability report does not create an entitlement to compensation. Any future bounty program will be announced separately and will apply only under its published terms.

## Credit

The project is happy to credit reporters in published advisories and release notes unless they prefer to remain anonymous.

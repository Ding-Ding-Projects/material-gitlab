# Status Hub

The site registers its repository, default branch, release channel, checks, and evidence in a local status card. State values distinguish unregistered, registered, pending, verified, and unavailable.

## Configuration and failure modes

Registration is local until an authenticated delivery bridge confirms acceptance. The UI never labels local storage as remote delivery and never presents an unverified link as evidence.

## Security and verification

Session credentials are not stored in the page. Verify registration, evidence updates, delivery refusal, unavailable state, reload, clear, and truthful status copy.

## Suggested articles

Read **Notifications** and **Landing page and offline documentation** next.

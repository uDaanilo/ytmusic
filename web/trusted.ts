// YouTube Music enforces Trusted Types, so every innerHTML assignment must go through a policy.
// Policies can only be created once per name, so a single one is shared by the whole bundle.
const policy = window.trustedTypes?.createPolicy("ytmusic-app", { createHTML: (input) => input })

export function trustedHTML(html: string): string {
  return (policy ? policy.createHTML(html) : html) as unknown as string
}

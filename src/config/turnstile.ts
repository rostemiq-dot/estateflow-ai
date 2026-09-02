const configuredSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();

// Turnstile site keys are public by design. Keep the environment variable for
// future environments, while the production key is available as a safe default
// so a missing Vercel environment variable cannot silently break authentication.
export const turnstileSiteKey = configuredSiteKey || "0x4AAAAAAEkpeukLGJPDza9_";

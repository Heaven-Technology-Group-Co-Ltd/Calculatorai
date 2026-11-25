/**
 * Next.js Instrumentation Hook
 *
 * Runs ONCE when the server starts. This is the ideal place to install
 * global error handlers that report to Discord.
 *
 * Enable in next.config.ts: `experimental: { instrumentationHook: true }`
 */

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import — prevent Edge Runtime from compiling Node.js–only code (process.on)
    const { installGlobalErrorCatcher } = await import("@/lib/admin/global-error-catcher");
    installGlobalErrorCatcher();
  }
}

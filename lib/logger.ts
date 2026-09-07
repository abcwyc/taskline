import 'server-only';

function serializeError(error: unknown) {
   if (error instanceof Error) {
      return { name: error.name, message: error.message, stack: error.stack };
   }
   return { value: String(error) };
}

export function logError(scope: string, error: unknown, context?: Record<string, unknown>) {
   const record = {
      level: 'error',
      scope,
      timestamp: new Date().toISOString(),
      error: serializeError(error),
      ...(context ? { context } : {}),
   };
   console.error(JSON.stringify(record));
}

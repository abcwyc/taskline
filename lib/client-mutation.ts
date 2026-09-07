export function createMutationGuard() {
   const versions = new Map<string, number>();
   const active = new Set<string>();

   return {
      begin(key: string): number {
         const version = (versions.get(key) ?? 0) + 1;
         versions.set(key, version);
         active.add(key);
         return version;
      },
      isCurrent(key: string, version: number): boolean {
         return versions.get(key) === version;
      },
      finish(key: string, version: number): void {
         if (versions.get(key) === version) active.delete(key);
      },
      hasActive(): boolean {
         return active.size > 0;
      },
   };
}

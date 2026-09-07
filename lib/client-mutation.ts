export function createMutationGuard() {
   const versions = new Map<string, number>();

   return {
      begin(key: string): number {
         const version = (versions.get(key) ?? 0) + 1;
         versions.set(key, version);
         return version;
      },
      isCurrent(key: string, version: number): boolean {
         return versions.get(key) === version;
      },
   };
}

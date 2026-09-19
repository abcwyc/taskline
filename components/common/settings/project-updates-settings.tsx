'use client';

import { ContentBlocks } from '@/components/common/issues/details/content-blocks';
import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
   AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { ContentBlock } from '@/mock-data/issue-details';
import {
   ProjectUpdateHealth,
   projectUpdateHealthColor,
   projectUpdateHealthLabel,
} from '@/mock-data/project-details';
import type { WorkspaceUpdateDTO } from '@/lib/api/types';
import { deleteProjectUpdate, fetchWorkspaceUpdates } from '@/lib/api/project-details';
import { useIsAdmin } from '@/lib/hooks/use-current-user';
import { useMembersStore } from '@/store/members-store';
import { apiErrorMessage } from '@/components/common/settings/shared';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

/** Health pill matching the project activity page. */
function HealthBadge({ health }: { health: string }) {
   const key = (
      ['on-track', 'at-risk', 'off-track'].includes(health) ? health : 'on-track'
   ) as ProjectUpdateHealth;
   return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-full border px-2 py-0.5">
         <span
            className="size-2 rounded-full"
            style={{ backgroundColor: projectUpdateHealthColor[key] }}
         />
         {projectUpdateHealthLabel[key]}
      </span>
   );
}

/** One feed entry: project link, health, author, date and rendered blocks. */
function UpdateEntry({
   update,
   orgId,
   isAdmin,
   onDeleted,
}: {
   update: WorkspaceUpdateDTO;
   orgId: string;
   isAdmin: boolean;
   onDeleted: () => void;
}) {
   const members = useMembersStore((s) => s.members);
   const [deleting, setDeleting] = useState(false);
   const author =
      members.find((member) => member.id === update.authorId) ??
      ({
         id: update.authorId,
         name: 'Unknown member',
         avatarUrl: '',
         email: '',
         status: 'offline',
         role: 'Member',
         joinedDate: '',
         teamIds: [],
         timezone: 'UTC',
      } as const);

   const handleDelete = async () => {
      setDeleting(false);
      try {
         await deleteProjectUpdate(update.projectId, update.id);
         onDeleted();
      } catch (err) {
         toast.error(apiErrorMessage(err, 'Failed to delete update'));
         console.error(err);
      }
   };

   return (
      <div className="group border rounded-lg p-4">
         <div className="flex items-center gap-2 text-sm min-w-0">
            <Link
               href={`/${orgId}/project/${update.projectId}/activity`}
               className="font-medium hover:underline truncate"
            >
               {update.projectName}
            </Link>
            <span className="text-xs text-muted-foreground shrink-0">
               {format(parseISO(update.date), 'MMM d, yyyy')}
            </span>
            <span className="ml-auto flex items-center gap-1.5 shrink-0">
               <HealthBadge health={update.health} />
               {isAdmin && (
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                     <AlertDialog open={deleting} onOpenChange={setDeleting}>
                        <AlertDialogTrigger asChild>
                           <button
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              aria-label="Delete update"
                              title="Delete update"
                           >
                              <Trash2 className="size-3.5" />
                           </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                           <AlertDialogHeader>
                              <AlertDialogTitle>Delete update</AlertDialogTitle>
                              <AlertDialogDescription>
                                 This update will be permanently removed from {update.projectName}.
                                 This action cannot be undone.
                              </AlertDialogDescription>
                           </AlertDialogHeader>
                           <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                 className="bg-destructive text-white hover:bg-destructive/90"
                                 onClick={handleDelete}
                              >
                                 Delete
                              </AlertDialogAction>
                           </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                  </span>
               )}
            </span>
         </div>
         <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar className="size-5">
               <AvatarImage src={author.avatarUrl} alt={author.name} />
               <AvatarFallback>{author.name[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground/80">{author.name}</span>
         </div>
         <div className="mt-1 text-sm leading-relaxed">
            <ContentBlocks blocks={(update.blocks ?? []) as ContentBlock[]} />
         </div>
      </div>
   );
}

/** Workspace "Project updates" settings: read-only feed of every project update. */
export default function ProjectUpdatesSettings() {
   const { orgId } = useParams<{ orgId: string }>();
   const isAdmin = useIsAdmin();
   const [updates, setUpdates] = useState<WorkspaceUpdateDTO[] | null>(null);

   const load = useCallback(async () => {
      try {
         setUpdates(await fetchWorkspaceUpdates());
      } catch (err) {
         console.error(err);
         toast.error(apiErrorMessage(err, 'Failed to load project updates'));
         setUpdates([]);
      }
   }, []);

   useEffect(() => {
      void load();
   }, [load]);

   return (
      <div className="w-full overflow-y-auto h-full">
         <div className="max-w-3xl mx-auto px-6 py-10 pb-20">
            <h1 className="text-2xl font-medium">Project updates</h1>
            <p className="text-sm text-muted-foreground mt-1">
               All project updates across the workspace, newest first. Updates are posted from each
               project&apos;s activity page.
            </p>

            {updates === null && (
               <p className="mt-10 text-sm text-muted-foreground">Loading updates…</p>
            )}
            {updates?.length === 0 && (
               <p className="mt-10 text-sm text-muted-foreground">
                  No project updates yet — post one from a project&apos;s activity page.
               </p>
            )}
            {updates && updates.length > 0 && (
               <div className="mt-8 flex flex-col gap-3">
                  {updates.map((update) => (
                     <UpdateEntry
                        key={update.id}
                        update={update}
                        orgId={orgId}
                        isAdmin={isAdmin}
                        onDeleted={() => void load()}
                     />
                  ))}
               </div>
            )}
         </div>
      </div>
   );
}

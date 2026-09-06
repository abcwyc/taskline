'use client';

import { useState } from 'react';

import { InviteDialog } from '@/components/common/forms/invite-dialog';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useMembersStore } from '@/store/members-store';
import { Plus } from 'lucide-react';

export default function HeaderNav() {
   const users = useMembersStore((s) => s.members);
   const me = useCurrentUser();
   const isAdmin = me?.role === 'Admin';
   const [open, setOpen] = useState(false);

   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-2">
            <SidebarTrigger className="" />
            <div className="flex items-center gap-1">
               <span className="text-sm font-medium">Members</span>
               <span className="text-xs bg-accent rounded-md px-1.5 py-1">{users.length}</span>
            </div>
         </div>
         {isAdmin && (
            <div className="flex items-center gap-2">
               <Button
                  className="relative"
                  size="xs"
                  variant="secondary"
                  onClick={() => setOpen(true)}
               >
                  <Plus className="size-4" />
                  Invite
               </Button>
            </div>
         )}
         <InviteDialog open={open} onOpenChange={setOpen} />
      </div>
   );
}

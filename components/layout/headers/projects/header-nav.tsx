'use client';

import { Button } from '@/components/ui/button';
import { ProjectDialog } from '@/components/common/forms/project-dialog';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useProjectsStore } from '@/store/projects-store';
import { Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HeaderNav() {
   const projectCount = useProjectsStore((s) => s.projects.length);
   const { orgId } = useParams<{ orgId: string }>();
   const router = useRouter();
   const [open, setOpen] = useState(false);

   return (
      <div className="w-full flex justify-between items-center border-b py-1.5 px-6 h-10">
         <div className="flex items-center gap-2">
            <SidebarTrigger className="" />
            <div className="flex items-center gap-1">
               <span className="text-sm font-medium">Projects</span>
               <span className="text-xs bg-accent rounded-md px-1.5 py-1">{projectCount}</span>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <Button className="relative" size="xs" onClick={() => setOpen(true)}>
               <Plus className="size-4" />
               <span className="hidden sm:inline ml-1">Create project</span>
            </Button>
         </div>

         <ProjectDialog
            open={open}
            onOpenChange={setOpen}
            onCreated={(p) => router.push(`/${orgId}/project/${p.id}/overview`)}
         />
      </div>
   );
}

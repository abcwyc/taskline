'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDocumentsStore } from '@/store/documents-store';
import { formatDistanceToNowStrict, parseISO } from 'date-fns';
import { ChevronRight, MoreHorizontal, Pin, Plus, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';

const timeAgo = (date: string) =>
   formatDistanceToNowStrict(parseISO(date), { addSuffix: true })
      .replace(' minutes', 'min')
      .replace(' hours', 'h')
      .replace(' days', 'd')
      .replace(' weeks', 'w')
      .replace(' months', 'mo')
      .replace(' years', 'y');

/**
 * Team Home — "Documents" tab: documents grouped in collapsible folders
 * with created / last edited metadata.
 */
export default function TeamDocuments() {
   const documentFolders = useDocumentsStore((s) => s.folders);
   const createDocument = useDocumentsStore((s) => s.createDocument);
   const renameDocument = useDocumentsStore((s) => s.renameDocument);
   const togglePin = useDocumentsStore((s) => s.togglePin);
   const deleteDocument = useDocumentsStore((s) => s.deleteDocument);

   const [newOpen, setNewOpen] = useState(false);
   const [newName, setNewName] = useState('');
   const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);

   const create = async () => {
      if (!newName.trim()) return;
      await createDocument({ name: newName.trim() });
      setNewName('');
      setNewOpen(false);
   };
   const rename = () => {
      if (renaming && renaming.name.trim()) renameDocument(renaming.id, renaming.name.trim());
      setRenaming(null);
   };

   return (
      <div className="w-full">
         <div className="flex items-center justify-between px-6 py-3 gap-2">
            <div className="grid grid-cols-[1fr_40px] md:grid-cols-[1fr_90px_90px_40px] w-full items-center text-sm text-muted-foreground">
               <span className="flex items-center gap-1 font-medium">Name ↓</span>
               <span className="hidden md:block">Created</span>
               <span className="hidden md:block">Last edited</span>
               <span />
            </div>
            <div className="flex items-center gap-2 shrink-0">
               <Button size="xs" onClick={() => setNewOpen(true)}>
                  <Plus className="size-4 md:mr-1" />
                  <span className="hidden md:inline">New document</span>
               </Button>
               <Button size="xs" variant="ghost">
                  <SlidersHorizontal className="size-4" />
               </Button>
            </div>
         </div>

         {documentFolders.map((folder) => (
            <Collapsible key={folder.id} defaultOpen={folder.documents.some((d) => d.pinned)}>
               <CollapsibleTrigger asChild>
                  <button className="group w-full flex items-center gap-2 px-6 h-10 bg-sidebar/30 hover:bg-sidebar/60 border-b border-border/50 text-sm">
                     <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                     <span className="text-base leading-none">{folder.icon}</span>
                     <span className="font-medium">{folder.name}</span>
                     <span className="text-muted-foreground">{folder.documents.length}</span>
                  </button>
               </CollapsibleTrigger>
               <CollapsibleContent>
                  {folder.documents.map((doc) => (
                     <div
                        key={doc.id}
                        className="grid grid-cols-[1fr_40px] md:grid-cols-[1fr_90px_90px_40px] items-center px-6 h-11 hover:bg-sidebar/50 border-b border-border/30 text-sm"
                     >
                        <div className="flex items-center gap-2 min-w-0 pl-6">
                           <span className="text-base leading-none">{doc.icon}</span>
                           <span className="font-medium truncate">{doc.name}</span>
                           {doc.pinned && <Pin className="size-3 text-muted-foreground shrink-0" />}
                        </div>
                        <span className="hidden md:block text-xs text-muted-foreground">
                           {timeAgo(doc.createdAt)}
                        </span>
                        <span className="hidden md:block text-xs text-muted-foreground">
                           {timeAgo(doc.updatedAt)}
                        </span>
                        <div className="flex items-center gap-1 justify-end">
                           <Avatar className="size-5">
                              <AvatarImage src={doc.creator.avatarUrl} alt={doc.creator.name} />
                              <AvatarFallback>{doc.creator.name[0]}</AvatarFallback>
                           </Avatar>
                           <DropdownMenu>
                              <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground">
                                 <MoreHorizontal className="size-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                 <DropdownMenuItem
                                    onClick={() => setRenaming({ id: doc.id, name: doc.name })}
                                 >
                                    Rename
                                 </DropdownMenuItem>
                                 <DropdownMenuItem onClick={() => togglePin(doc.id, !doc.pinned)}>
                                    {doc.pinned ? 'Unpin' : 'Pin'}
                                 </DropdownMenuItem>
                                 <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => deleteDocument(doc.id)}
                                 >
                                    Delete
                                 </DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>
                        </div>
                     </div>
                  ))}
               </CollapsibleContent>
            </Collapsible>
         ))}

         <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogContent className="sm:max-w-sm">
               <DialogHeader>
                  <DialogTitle>New document</DialogTitle>
               </DialogHeader>
               <div className="flex flex-col gap-1.5 py-2">
                  <Label htmlFor="doc-name">Name</Label>
                  <Input
                     id="doc-name"
                     autoFocus
                     value={newName}
                     onChange={(e) => setNewName(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && create()}
                     placeholder="Meeting notes"
                  />
               </div>
               <DialogFooter>
                  <Button variant="ghost" onClick={() => setNewOpen(false)}>
                     Cancel
                  </Button>
                  <Button onClick={create} disabled={!newName.trim()}>
                     Create
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <Dialog open={!!renaming} onOpenChange={(v) => !v && setRenaming(null)}>
            <DialogContent className="sm:max-w-sm">
               <DialogHeader>
                  <DialogTitle>Rename document</DialogTitle>
               </DialogHeader>
               <div className="py-2">
                  <Input
                     autoFocus
                     value={renaming?.name ?? ''}
                     onChange={(e) => setRenaming((r) => (r ? { ...r, name: e.target.value } : r))}
                     onKeyDown={(e) => e.key === 'Enter' && rename()}
                  />
               </div>
               <DialogFooter>
                  <Button variant="ghost" onClick={() => setRenaming(null)}>
                     Cancel
                  </Button>
                  <Button onClick={rename}>Save</Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}

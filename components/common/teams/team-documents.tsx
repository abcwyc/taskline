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
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
   ChevronRight,
   FolderPlus,
   MoreHorizontal,
   Pin,
   Plus,
   SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useState } from 'react';

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
   const createFolder = useDocumentsStore((s) => s.createFolder);
   const renameFolder = useDocumentsStore((s) => s.renameFolder);
   const deleteFolder = useDocumentsStore((s) => s.deleteFolder);
   const hydrate = useDocumentsStore((s) => s.hydrate);

   useEffect(() => {
      void hydrate();
   }, [hydrate]);

   const [newOpen, setNewOpen] = useState(false);
   const [newName, setNewName] = useState('');
   const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
   const [newFolderOpen, setNewFolderOpen] = useState(false);
   const [newFolderName, setNewFolderName] = useState('');
   const [newFolderIcon, setNewFolderIcon] = useState('📁');
   const [renamingFolder, setRenamingFolder] = useState<{ id: string; name: string } | null>(null);
   const [deletingFolder, setDeletingFolder] = useState<{ id: string; name: string } | null>(null);

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
   const createNewFolder = async () => {
      if (!newFolderName.trim()) return;
      await createFolder(newFolderName.trim(), newFolderIcon.trim() || '📁');
      setNewFolderName('');
      setNewFolderIcon('📁');
      setNewFolderOpen(false);
   };
   const renameFolderSubmit = () => {
      if (renamingFolder && renamingFolder.name.trim())
         renameFolder(renamingFolder.id, renamingFolder.name.trim());
      setRenamingFolder(null);
   };
   const deleteFolderSubmit = () => {
      if (deletingFolder) deleteFolder(deletingFolder.id);
      setDeletingFolder(null);
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
               <Button size="xs" variant="secondary" onClick={() => setNewFolderOpen(true)}>
                  <FolderPlus className="size-4 md:mr-1" />
                  <span className="hidden md:inline">New folder</span>
               </Button>
            </div>
         </div>

         {documentFolders.map((folder) => (
            <Collapsible key={folder.id} defaultOpen={folder.documents.some((d) => d.pinned)}>
               <div className="flex items-center h-10 bg-sidebar/30 hover:bg-sidebar/60 border-b border-border/50 text-sm">
                  <CollapsibleTrigger asChild>
                     <button className="group flex flex-1 items-center gap-2 px-6 h-full text-left">
                        <ChevronRight className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                        <span className="text-base leading-none">{folder.icon}</span>
                        <span className="font-medium">{folder.name}</span>
                        <span className="text-muted-foreground">{folder.documents.length}</span>
                     </button>
                  </CollapsibleTrigger>
                  <div className="flex items-center pr-6">
                     <DropdownMenu>
                        <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground">
                           <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <DropdownMenuItem
                              onClick={() =>
                                 setRenamingFolder({ id: folder.id, name: folder.name })
                              }
                           >
                              Rename
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                 setDeletingFolder({ id: folder.id, name: folder.name })
                              }
                           >
                              Delete
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
               </div>
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

         <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
            <DialogContent className="sm:max-w-sm">
               <DialogHeader>
                  <DialogTitle>New folder</DialogTitle>
               </DialogHeader>
               <div className="flex flex-col gap-4 py-2">
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="folder-name">Name</Label>
                     <Input
                        id="folder-name"
                        autoFocus
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && createNewFolder()}
                        placeholder="Meeting notes"
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <Label htmlFor="folder-icon">Icon</Label>
                     <Input
                        id="folder-icon"
                        value={newFolderIcon}
                        onChange={(e) => setNewFolderIcon(e.target.value)}
                        placeholder="📁"
                        className="w-16 text-center"
                     />
                  </div>
               </div>
               <DialogFooter>
                  <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>
                     Cancel
                  </Button>
                  <Button onClick={createNewFolder} disabled={!newFolderName.trim()}>
                     Create
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <Dialog open={!!renamingFolder} onOpenChange={(v) => !v && setRenamingFolder(null)}>
            <DialogContent className="sm:max-w-sm">
               <DialogHeader>
                  <DialogTitle>Rename folder</DialogTitle>
               </DialogHeader>
               <div className="py-2">
                  <Input
                     autoFocus
                     value={renamingFolder?.name ?? ''}
                     onChange={(e) =>
                        setRenamingFolder((r) => (r ? { ...r, name: e.target.value } : r))
                     }
                     onKeyDown={(e) => e.key === 'Enter' && renameFolderSubmit()}
                  />
               </div>
               <DialogFooter>
                  <Button variant="ghost" onClick={() => setRenamingFolder(null)}>
                     Cancel
                  </Button>
                  <Button onClick={renameFolderSubmit}>Save</Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <AlertDialog open={!!deletingFolder} onOpenChange={(v) => !v && setDeletingFolder(null)}>
            <AlertDialogContent>
               <AlertDialogHeader>
                  <AlertDialogTitle>Delete folder</AlertDialogTitle>
                  <AlertDialogDescription>
                     {`Delete folder "${deletingFolder?.name}"? Only empty folders can be deleted — move or delete its documents first.`}
                  </AlertDialogDescription>
               </AlertDialogHeader>
               <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteFolderSubmit}>Delete</AlertDialogAction>
               </AlertDialogFooter>
            </AlertDialogContent>
         </AlertDialog>
      </div>
   );
}

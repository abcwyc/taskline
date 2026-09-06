'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select';
import type { Cycle, CycleStatus } from '@/mock-data/cycles';
import { useCyclesStore } from '@/store/cycles-store';

const STATUSES: CycleStatus[] = ['planned', 'upcoming', 'current', 'completed'];

export function CycleDialog({
   open,
   onOpenChange,
   teamId,
   cycle,
}: {
   open: boolean;
   onOpenChange: (v: boolean) => void;
   teamId: string;
   cycle?: Cycle;
}) {
   const createCycle = useCyclesStore((s) => s.createCycle);
   const updateCycle = useCyclesStore((s) => s.updateCycle);

   const [name, setName] = useState('');
   const [status, setStatus] = useState<CycleStatus>('planned');
   const [startDate, setStartDate] = useState('');
   const [endDate, setEndDate] = useState('');
   const [capacity, setCapacity] = useState('0');

   useEffect(() => {
      if (!open) return;
      const today = new Date().toISOString().slice(0, 10);
      const inTwoWeeks = new Date(Date.now() + 12096e5).toISOString().slice(0, 10);
      setName(cycle?.name ?? '');
      setStatus(cycle?.status ?? 'planned');
      setStartDate(cycle?.startDate ?? today);
      setEndDate(cycle?.endDate ?? inTwoWeeks);
      setCapacity(String(cycle?.capacity ?? 0));
   }, [open, cycle]);

   const submit = async () => {
      const body = {
         name: name.trim() || undefined,
         status,
         startDate,
         endDate,
         capacity: Number(capacity) || 0,
      };
      if (cycle) updateCycle(cycle.id, body);
      else await createCycle({ ...body, teamId });
      onOpenChange(false);
   };

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <DialogTitle>{cycle ? 'Edit cycle' : 'New cycle'}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cycle-name">Name</Label>
                  <Input
                     id="cycle-name"
                     value={name}
                     autoFocus
                     onChange={(e) => setName(e.target.value)}
                     placeholder="Cycle 24"
                  />
               </div>
               <div className="flex gap-3">
                  <div className="flex flex-col gap-1.5 flex-1">
                     <Label htmlFor="cycle-start">Start</Label>
                     <Input
                        id="cycle-start"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                     />
                  </div>
                  <div className="flex flex-col gap-1.5 flex-1">
                     <Label htmlFor="cycle-end">End</Label>
                     <Input
                        id="cycle-end"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                     />
                  </div>
               </div>
               <div className="flex gap-3">
                  <div className="flex flex-col gap-1.5 flex-1">
                     <Label>Status</Label>
                     <Select value={status} onValueChange={(v) => setStatus(v as CycleStatus)}>
                        <SelectTrigger>
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                           {STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                 {s}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <div className="flex flex-col gap-1.5 w-28">
                     <Label htmlFor="cycle-cap">Capacity</Label>
                     <Input
                        id="cycle-cap"
                        type="number"
                        min={0}
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                     />
                  </div>
               </div>
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Cancel
               </Button>
               <Button onClick={submit}>{cycle ? 'Save' : 'Create'}</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}

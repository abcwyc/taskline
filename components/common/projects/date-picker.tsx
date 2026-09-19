'use client';

import * as React from 'react';
import { enUS, zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLanguage } from '@/components/providers/language-provider';
import { formatProjectDate } from '@/lib/project-localization';

interface DatePickerProps {
   date: Date | undefined;
   onDateChange?: (date: Date | undefined) => void;
}

export function DatePicker({ date, onDateChange }: DatePickerProps) {
   const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);
   const [open, setOpen] = React.useState<boolean>(false);
   const { locale, t } = useLanguage();

   const handleDateSelect = (date: Date | undefined) => {
      setSelectedDate(date);
      if (onDateChange) {
         onDateChange(date);
      }
      setOpen(false);
   };

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button
               variant="ghost"
               className="h-7 px-2 justify-start text-left font-normal"
               size="sm"
            >
               <CalendarIcon className="h-4 w-4 md:mr-0.5" />
               {selectedDate ? (
                  <span className="text-xs hidden xl:inline mt-[1px]">
                     {formatProjectDate(locale, selectedDate.toISOString(), true)}
                  </span>
               ) : (
                  <span className="text-xs text-muted-foreground hidden xl:inline mt-[1px]">
                     {t('No date')}
                  </span>
               )}
            </Button>
         </PopoverTrigger>
         <PopoverContent className="w-auto p-0" align="start">
            <Calendar
               mode="single"
               locale={locale === 'zh-CN' ? zhCN : enUS}
               selected={selectedDate}
               onSelect={handleDateSelect}
               initialFocus
            />
         </PopoverContent>
      </Popover>
   );
}

'use client';

import type { ComponentProps } from 'react';

import { Input } from '@/components/ui/input';

import { useLanguage } from './language-provider';

type TInputProps = Omit<ComponentProps<typeof Input>, 'placeholder'> & {
   /** Translation key (English source text) for the placeholder. */
   placeholderKey: string;
};

/** Input whose placeholder is translated. Usable inside server components. */
export function TInput({ placeholderKey, ...props }: TInputProps) {
   const { t } = useLanguage();
   return <Input {...props} placeholder={t(placeholderKey)} />;
}

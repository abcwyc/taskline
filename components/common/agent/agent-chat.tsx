'use client';

import { InlineText } from '@/components/common/issues/details/content-blocks';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useMembersStore } from '@/store/members-store';
import { useMeStore } from '@/store/me-store';
import { useAgentChatStore } from '@/store/agent-chat-store';
import { toast } from 'sonner';
import { ArrowUp, Bot, Loader2, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/components/providers/language-provider';

function AgentMessageBody({ content, streaming }: { content: string; streaming?: boolean }) {
   const lines = content.split('\n');
   return (
      <div className="text-sm leading-relaxed flex flex-col gap-1">
         {lines.map((line, index) => {
            const trimmed = line.trim();
            if (trimmed === '') return <span key={index} className="h-1.5" />;
            if (trimmed.startsWith('- ')) {
               return (
                  <span key={index} className="flex gap-2">
                     <span className="text-muted-foreground mt-[7px] size-1 rounded-full bg-muted-foreground shrink-0" />
                     <span>
                        <InlineText text={trimmed.slice(2)} />
                     </span>
                  </span>
               );
            }
            const numbered = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (numbered) {
               return (
                  <span key={index} className="flex gap-2">
                     <span className="text-muted-foreground tabular-nums">{numbered[1]}.</span>
                     <span>
                        <InlineText text={numbered[2]} />
                     </span>
                  </span>
               );
            }
            return (
               <span key={index}>
                  <InlineText text={trimmed} />
               </span>
            );
         })}
         {streaming && <span className="inline-block w-2 h-4 bg-foreground/60 animate-pulse" />}
      </div>
   );
}

function ChatComposer({
   onSend,
   autoFocus,
   large,
   busy,
}: {
   onSend: (input: string) => void;
   autoFocus?: boolean;
   large?: boolean;
   busy?: boolean;
}) {
   const [value, setValue] = useState('');
   const { t } = useLanguage();

   const submit = () => {
      if (value.trim() === '') return;
      onSend(value.trim());
      setValue('');
   };

   return (
      <div className="w-full border rounded-xl bg-container shadow-xs">
         <textarea
            value={value}
            autoFocus={autoFocus}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
               if (event.key === 'Enter' && !event.shiftKey && !busy) {
                  event.preventDefault();
                  submit();
               }
            }}
            placeholder={t('Ask the agent…')}
            className={cn(
               'w-full resize-none bg-transparent px-4 pt-3.5 text-sm outline-none placeholder:text-muted-foreground',
               large ? 'min-h-16' : 'min-h-12'
            )}
         />
         <div className="flex items-center justify-between px-2.5 pb-2.5">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-1.5">
               <Sparkles className="size-3.5" />
               {t('Workspace agent')}
            </span>
            <Button
               size="icon"
               className="size-7 rounded-full"
               onClick={submit}
               disabled={value.trim() === '' || busy}
               aria-label={t('Send')}
            >
               {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </Button>
         </div>
      </div>
   );
}

const STARTERS = [
   {
      title: 'What is blocking the team?',
      description: 'Ask about blockers, stale issues and what changed recently.',
   },
   {
      title: 'Summarize open work',
      description: 'Get a digest of open issues by status, priority and assignee.',
   },
   {
      title: 'Plan my week',
      description: 'Ask for a suggested focus list based on open work.',
   },
];

/**
 * The workspace Agent page. Conversations persist on the server; replies come
 * from the configured LLM backend. When the backend is unavailable the page
 * shows the operator's reason instead of fabricating answers.
 */
export default function AgentChat() {
   const { t } = useLanguage();
   const members = useMembersStore((s) => s.members);
   const me = useMeStore((s) => s.me);
   const chats = useAgentChatStore((s) => s.chats);
   const activeChatId = useAgentChatStore((s) => s.activeChatId);
   const sendMessage = useAgentChatStore((s) => s.sendMessage);
   const hydrate = useAgentChatStore((s) => s.hydrate);
   const sending = useAgentChatStore((s) => s.sending);
   const unconfigured = useAgentChatStore((s) => s.unconfigured);
   const [examplesDismissed, setExamplesDismissed] = useState(false);
   const scrollRef = useRef<HTMLDivElement>(null);

   const activeChat = chats.find((chat) => chat.id === activeChatId);
   const meMember = (me && members.find((m) => m.id === me.id)) ?? members[0];

   useEffect(() => {
      void hydrate();
   }, [hydrate]);

   useEffect(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
   }, [activeChat?.messages, sending]);

   const handleSend = (input: string) => {
      if (unconfigured) {
         toast.error(unconfigured);
         return;
      }
      void sendMessage(input);
   };

   /* ------------------------------- Hero ------------------------------- */
   if (!activeChat) {
      return (
         <div className="w-full h-full flex flex-col items-center overflow-y-auto">
            {unconfigured && (
               <div className="mt-4 max-w-2xl mx-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                  <p className="font-medium">{t('The agent is unavailable on this server')}</p>
                  <p className="mt-1 text-muted-foreground">{unconfigured}</p>
               </div>
            )}

            <div className="flex-1 w-full max-w-2xl px-6 flex flex-col justify-center pb-24">
               <div className="flex justify-center mb-8 text-muted-foreground/30">
                  <Bot className="size-24" strokeWidth={1} />
               </div>
               <ChatComposer onSend={handleSend} autoFocus large />

               {!examplesDismissed && (
                  <div className="mt-6">
                     <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">
                           {t('Get started with some examples')}
                        </span>
                        <button
                           onClick={() => setExamplesDismissed(true)}
                           className="text-muted-foreground hover:text-foreground transition-colors"
                           aria-label={t('Dismiss examples')}
                        >
                           <X className="size-4" />
                        </button>
                     </div>
                     <div className="grid sm:grid-cols-3 gap-3">
                        {STARTERS.map((example) => (
                           <button
                              key={example.title}
                              type="button"
                              onClick={() => handleSend(example.title)}
                              className="border rounded-lg p-4 text-left hover:bg-accent/40 transition-colors"
                           >
                              <Sparkles className="size-4 text-muted-foreground" />
                              <p className="mt-6 text-sm font-medium">{t(example.title)}</p>
                              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                 {t(example.description)}
                              </p>
                           </button>
                        ))}
                     </div>
                  </div>
               )}
            </div>
         </div>
      );
   }

   /* --------------------------- Conversation --------------------------- */
   return (
      <div className="w-full h-full flex flex-col overflow-hidden">
         {unconfigured && (
            <div className="shrink-0 max-w-2xl w-full mx-auto px-6 pt-4">
               <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
                  <p className="font-medium">{t('The agent is unavailable on this server')}</p>
                  <p className="mt-1 text-muted-foreground">{unconfigured}</p>
               </div>
            </div>
         )}
         <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-6">
               {activeChat.messages.map((message) =>
                  message.role === 'user' ? (
                     <div key={message.id} className="flex justify-end">
                        <div className="flex items-start gap-2.5 max-w-[85%]">
                           <div className="rounded-2xl rounded-tr-sm bg-accent px-4 py-2.5 text-sm">
                              {message.content}
                           </div>
                           <Avatar className="size-6 mt-1 shrink-0">
                              <AvatarImage
                                 src={meMember?.avatarUrl}
                                 alt={meMember?.name ?? t('You')}
                              />
                              <AvatarFallback>{(meMember?.name ?? 'Y')[0]}</AvatarFallback>
                           </Avatar>
                        </div>
                     </div>
                  ) : (
                     <div key={message.id} className="flex items-start gap-2.5">
                        <span className="mt-1 inline-flex size-6 items-center justify-center rounded-full border bg-container shrink-0">
                           <Bot className="size-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                           <AgentMessageBody
                              content={message.content}
                              streaming={message.streaming}
                           />
                        </div>
                     </div>
                  )
               )}
            </div>
         </div>
         <div className="shrink-0 border-t bg-container">
            <div className="max-w-2xl mx-auto px-6 py-4">
               <ChatComposer onSend={handleSend} busy={sending} />
            </div>
         </div>
      </div>
   );
}

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { fetchAiSetting, putSetting, type AiSetting } from '@/lib/api/workspace-settings';
import { useMeStore } from '@/store/me-store';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { SettingsCard, SettingsRow, SettingsSection, SettingsShell } from './shared';

/** Workspace "AI & Agents" settings — the workspace-level AI agent configuration. */
export default function AiAgents() {
   const isAdmin = useMeStore((s) => s.me?.role === 'Admin');
   const [value, setValue] = useState<AiSetting>({ enabled: false, model: '', systemPrompt: '' });
   const [saved, setSaved] = useState<AiSetting>({ enabled: false, model: '', systemPrompt: '' });
   const [loaded, setLoaded] = useState(false);
   const [loadError, setLoadError] = useState<string | null>(null);
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      let cancelled = false;
      fetchAiSetting()
         .then((setting) => {
            if (cancelled) return;
            setValue(setting);
            setSaved(setting);
            setLoaded(true);
         })
         .catch((err) => {
            if (cancelled) return;
            setLoadError((err as Error).message);
         });
      return () => {
         cancelled = true;
      };
   }, []);

   const save = async () => {
      setSaving(true);
      try {
         await putSetting('ai', value);
         setSaved(value);
         toast.success('AI settings saved');
      } catch (err) {
         toast.error('Failed to save AI settings');
         console.error(err);
      } finally {
         setSaving(false);
      }
   };

   if (!loaded) {
      return (
         <SettingsShell title="AI & Agents" description="Configure the workspace AI agent">
            <p className="text-sm text-muted-foreground">
               {loadError ? `Failed to load AI settings: ${loadError}` : 'Loading…'}
            </p>
         </SettingsShell>
      );
   }

   const dirty =
      value.enabled !== saved.enabled ||
      value.model !== saved.model ||
      value.systemPrompt !== saved.systemPrompt;

   return (
      <SettingsShell
         title="AI & Agents"
         description="Configure the workspace AI agent. Only workspace admins can change these settings."
      >
         <SettingsSection title="Workspace AI agent">
            <SettingsCard>
               <SettingsRow
                  title="Enable workspace AI agent"
                  description="The agent answers only when an LLM endpoint is configured on the server (AGENT_LLM_* env vars)."
                  trailing={
                     <Switch
                        checked={value.enabled}
                        disabled={!isAdmin}
                        onCheckedChange={(enabled) => setValue((v) => ({ ...v, enabled }))}
                     />
                  }
               />
            </SettingsCard>
         </SettingsSection>

         <SettingsSection
            title="Model and instructions"
            description="The model the agent uses and the system prompt it starts from"
         >
            <SettingsCard>
               <SettingsRow
                  title="Model"
                  description="For example gpt-4o-mini or your gateway model id"
                  trailing={
                     <Input
                        value={value.model}
                        disabled={!isAdmin}
                        onChange={(e) => setValue((v) => ({ ...v, model: e.target.value }))}
                        placeholder="gpt-4o-mini"
                        className="h-8 w-56"
                     />
                  }
               />
               <div className="px-4 py-3">
                  <div className="text-sm font-medium">System prompt</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                     Instructions for the agent when answering questions about this workspace
                  </p>
                  <Textarea
                     value={value.systemPrompt}
                     disabled={!isAdmin}
                     onChange={(e) => setValue((v) => ({ ...v, systemPrompt: e.target.value }))}
                     placeholder="You are a helpful assistant for our team…"
                     className="mt-3 min-h-28"
                  />
               </div>
            </SettingsCard>
            {isAdmin && (
               <div className="flex justify-end">
                  <Button size="sm" disabled={!dirty || saving} onClick={save}>
                     {saving ? 'Saving…' : 'Save changes'}
                  </Button>
               </div>
            )}
         </SettingsSection>
      </SettingsShell>
   );
}

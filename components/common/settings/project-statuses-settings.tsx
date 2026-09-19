'use client';

import { SettingsShell } from './shared';
import { WorkflowStatusesSection } from './workflow-statuses-section';

/**
 * Workspace "Project statuses" settings. Statuses are org-wide in this app —
 * issues and projects share the same workflow — so this page manages the
 * same set of statuses as the per-team settings, from a workspace angle.
 */
export default function ProjectStatusesSettings() {
   return (
      <SettingsShell
         title="Project statuses"
         description="Project statuses define the workflow that projects go through from start to completion"
      >
         <WorkflowStatusesSection
            title="Project workflow statuses"
            description="Statuses are shared across the workspace — issues and projects use the same set"
         />
      </SettingsShell>
   );
}

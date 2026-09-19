/** Config of the generic settings pages that don't have a dedicated UI yet. */
export interface PlaceholderConfig {
   title: string;
   description?: string;
   actionLabel?: string;
   emptyLabel: string;
}

export const PLACEHOLDER_SECTIONS: Record<string, PlaceholderConfig> = {
   'slas': {
      title: 'SLAs',
      description: 'Automatically apply deadlines to issues based on their properties',
      actionLabel: 'New SLA',
      emptyLabel: 'No SLAs',
   },
   'project-labels': {
      title: 'Project labels',
      actionLabel: 'New label',
      emptyLabel: 'No project labels',
   },
   'project-templates': {
      title: 'Project templates',
      actionLabel: 'New template',
      emptyLabel: 'No project templates',
   },
   'project-updates': {
      title: 'Project updates',
      description: 'Configure how project updates are collected across the workspace',
      emptyLabel: 'No updates',
   },
   'documents': {
      title: 'Documents',
      actionLabel: 'New document',
      emptyLabel: 'No documents',
   },
   'releases': {
      title: 'Releases',
      actionLabel: 'New release',
      emptyLabel: 'No releases',
   },
   'pulse': {
      title: 'Pulse',
      description: 'A feed of important updates across your workspace',
      emptyLabel: 'No updates',
   },
   'emojis': {
      title: 'Emojis',
      actionLabel: 'Upload',
      emptyLabel: 'No emojis',
   },
};

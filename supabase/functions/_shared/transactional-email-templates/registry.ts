/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as rallyInvite } from './rally-invite.tsx'
import { template as squadMilestone } from './squad-milestone.tsx'
import { template as eventReminder } from './event-reminder.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'rally-invite': rallyInvite,
  'squad-milestone': squadMilestone,
  'event-reminder': eventReminder,
}

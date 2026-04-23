/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const LOGO_URL =
  'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/email-assets/logo.svg'

interface EventReminderProps {
  eventName?: string
  locationName?: string
  eventUrl?: string
}

const EventReminderEmail = ({
  eventName = 'the R@lly',
  locationName = 'the spot',
  eventUrl = 'https://rlly.cloud',
}: EventReminderProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>T-Minus 60 Minutes. Get your head in the game. 🟠</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="R@lly" width="60" height="60" style={logoStyle} />
        <Heading style={h1}>T-Minus 60 Minutes.</Heading>
        <Text style={text}>
          The R@lly for <strong>{eventName}</strong> starts in an hour.
        </Text>
        <Text style={text}>
          Get your head in the game.
        </Text>
        <Text style={text}>
          See you at <strong style={highlight}>{locationName}</strong>.
        </Text>
        <Button style={button} href={eventUrl}>
          Open the R@lly
        </Button>
        <Text style={footer}>Let's R@lly. — The R@lly Team</Text>
        <Text style={socialFooter}>
          If you're into baller shit.{' '}
          <Link href="https://instagram.com/asap.rally" style={socialLink}>
            Follow us @asap.rally
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EventReminderEmail,
  subject: 'T-Minus 60 Minutes.',
  displayName: 'Event Reminder (1hr)',
  previewData: {
    eventName: 'Saturday Night Kickoff',
    locationName: 'The Rooftop',
    eventUrl: 'https://rlly.cloud/event/sample',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Montserrat', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logoStyle = { margin: '0 auto 24px', display: 'block' as const, borderRadius: '50%' }
const h1 = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  color: '#1a1f2b',
  margin: '0 0 16px',
  letterSpacing: '-0.5px',
}
const text = {
  fontSize: '16px',
  color: '#1a1f2b',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const highlight = { color: '#F47A19' }
const button = {
  backgroundColor: '#F47A19',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '700' as const,
  borderRadius: '8px',
  padding: '16px 32px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  margin: '16px 0 0',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
const socialFooter = {
  fontSize: '12px',
  color: '#999999',
  margin: '8px 0 0',
  textAlign: 'center' as const,
}
const socialLink = { color: '#F47A19', textDecoration: 'none' }

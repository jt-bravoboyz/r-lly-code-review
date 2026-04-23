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

interface SquadMilestoneProps {
  squadName?: string
  memberCount?: number
  squadUrl?: string
}

const SquadMilestoneEmail = ({
  squadName = 'Your Squad',
  memberCount = 10,
  squadUrl = 'https://rlly.cloud',
}: SquadMilestoneProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Squad is getting heavy. 🟠</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="R@lly" width="60" height="60" style={logoStyle} />
        <Heading style={h1}>Your Squad is getting heavy.</Heading>
        <Text style={text}>
          Your squad <strong>{squadName}</strong> just hit{' '}
          <strong style={highlight}>{memberCount} members</strong>.
        </Text>
        <Text style={text}>
          You're building a movement, not just a group chat.
        </Text>
        <Text style={text}>
          Keep that same energy.
        </Text>
        <Button style={button} href={squadUrl}>
          Open Your Squad
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
  component: SquadMilestoneEmail,
  subject: 'Your Squad is getting heavy.',
  displayName: 'Squad Milestone',
  previewData: {
    squadName: 'The Night Owls',
    memberCount: 25,
    squadUrl: 'https://rlly.cloud/squad/sample',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Montserrat', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logoStyle = { margin: '0 auto 24px', display: 'block' as const, borderRadius: '50%' }
const h1 = {
  fontSize: '26px',
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

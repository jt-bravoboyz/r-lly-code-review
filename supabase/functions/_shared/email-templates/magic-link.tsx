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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

const LOGO_URL = 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/email-assets/logo.svg'

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your R@lly login link is here 🔑</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="R@lly" width="60" height="60" style={logoStyle} />
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Tap below to jump right into {siteName}. This link expires shortly, so
          don't wait!
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log In to R@lly
        </Button>
        <Text style={footer}>
          Didn't request this? No action needed—just ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Montserrat', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logoStyle = { margin: '0 0 24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1f2b',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#616874',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const button = {
  backgroundColor: '#F47A19',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }

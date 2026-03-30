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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

const LOGO_URL = 'https://lovzfxppnxictkvymyot.supabase.co/storage/v1/object/public/email-assets/logo.svg'

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You're in. Your account is live. 🟠</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="R@lly" width="60" height="60" style={logoStyle} />
        <Heading style={h1}>You're in.</Heading>
        <Text style={subheading}>Your account is live.</Text>
        <Text style={text}>
          You're now part of a system built for people who don't wait for plans—they set them in motion.
        </Text>
        <Text style={text}>
          This is where the night organizes itself.
        </Text>
        <Text style={text}>
          Stay ready.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm My Account & R@lly Up
        </Button>
        <Text style={footer}>
          Let's R@lly. — The R@lly Team
        </Text>
        <Text style={socialFooter}>
          If you're into baller shit. <Link href="https://instagram.com/asap.rally" style={socialLink}>Follow us @asap.rally</Link>
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Montserrat', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logoStyle = { margin: '0 auto 24px', display: 'block' as const, borderRadius: '50%' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1a1f2b',
  margin: '0 0 4px',
}
const subheading = {
  fontSize: '20px',
  fontWeight: '600' as const,
  color: '#1a1f2b',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#616874',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const button = {
  backgroundColor: '#F47A19',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  margin: '12px 0 0',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
const socialFooter = { fontSize: '12px', color: '#999999', margin: '8px 0 0', textAlign: 'center' as const }
const socialLink = { color: '#F47A19', textDecoration: 'none' }

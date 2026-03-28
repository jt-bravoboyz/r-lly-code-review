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
    <Preview>Let's go! Confirm your R@lly account 🎉</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="R@lly" width="120" height="40" style={logoStyle} />
        <Heading style={h1}>Welcome to the movement 🤙</Heading>
        <Text style={text}>
          You're one tap away from joining{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          . Confirm your email and let's get this R@lly started.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verify & Get Started
        </Button>
        <Text style={footer}>
          If you didn't sign up for R@lly, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: '#F47A19', textDecoration: 'underline' }
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

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
    <Preview>Welcome to the Movement 🟠 Let's make it legendary.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="R@lly" width="120" height="40" style={logoStyle} />
        <Heading style={h1}>The night is young. Let's make it legendary. 🤙</Heading>
        <Text style={text}>
          You're officially part of the R@lly community. Whether you're coordinating
          the ultimate pre-game, leading the squad to the next spot, or ensuring
          everyone gets home safe—you're in control now.
        </Text>
        <Text style={text}>
          R@lly is built for the moments that matter. No more messy group chats. No
          more "did you get home?" texts. Just pure momentum.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirm My Account & R@lly Up
        </Button>
        <Text style={footer}>
          See you at the next spot. — The R@lly Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Montserrat', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logoStyle = { margin: '0 auto 24px', display: 'block' as const }
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

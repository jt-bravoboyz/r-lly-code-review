import { Composition } from 'remotion';
import { WelcomeBack } from './WelcomeBack';

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={WelcomeBack}
    durationInFrames={36}
    fps={30}
    width={1080}
    height={1920}
  />
);

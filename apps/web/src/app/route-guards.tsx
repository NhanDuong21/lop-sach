import type { AuthUser } from '@lop-sach/contracts';

export function onboardingRouteFor(user: AuthUser): '/onboarding' | '/' {
  return !user.hasClassroom || !user.onboardingCompleted ? '/onboarding' : '/';
}

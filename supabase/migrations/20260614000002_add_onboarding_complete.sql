-- Tracks whether the user has completed the welcome wizard.
-- Referenced in store.ts mapToUserProfile and updateProfile.
ALTER TABLE public.users
  ADD COLUMN onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

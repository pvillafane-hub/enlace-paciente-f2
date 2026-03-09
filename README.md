# Patient Portal MVP

This is an MVP for a Patient Portal web app built with Next.js, React, TypeScript, Tailwind CSS, and Prisma ORM with PostgreSQL. It includes authentication, document upload (mocked storage), viewing, and sharing features. Designed for accessibility with large fonts and simple UI.

## Features
- Landing page with sign up/login
- Sign up with demographics and password validation
- Dashboard with upload/view/share
- Upload documents with type/facility metadata (mock S3 upload)
- View documents list with delete
- Share with expiring links
- Basic audit logging
- MFA placeholder (for Cognito integration)

## Project Structure
- `app/`: Pages and layouts
- `components/`: Reusable UI components
- `lib/`: Utilities (auth, validation)
- `prisma/`: Schema and migrations

## Notes
- Storage is mocked (in-memory array for demo; replace with S3).
- Auth uses NextAuth with credentials provider (bcrypt hashing).
- MFA: Placeholder in sign up/login; integrate Cognito later.
- Accessibility: ARIA labels, large fonts, high contrast.
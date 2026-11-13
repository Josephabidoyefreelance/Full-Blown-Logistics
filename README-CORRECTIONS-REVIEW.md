# JAAD correction package

This ZIP is based on the previously supplied homepage/ERP source patch, not the complete JAAD repository.

## Changes in this package
- Legal-policy modal: original JAAD logo in a black header, white document stage, and a loading state instead of exposing a blank grey panel.
- ERP: retains Back to website above and outside the navigation header; improves the discreet admin-access target so it is visible on hover/focus and clickable.
- Homepage footer: retains About Us, Careers, and the discreet admin link.
- Root layout: sets the dark background and Arial/Helvetica font at the document root to reduce background/font mismatch during reload.
- WhatsApp pricing link and other prior changes in the supplied patch are retained.

## Apply safely
1. Back up the matching files in your current project.
2. Copy the files under `jaad-redesigned-homepage/src` into the same paths in your project. Copy `public` assets only if your project does not already have the matching logo/images/PDFs.
3. Do not replace `.env.local`, Supabase settings, authentication files, or unrelated ERP modules.

## Verification status
The archive structure and changed source files have been checked for presence. This package has not been executed in your full application or tested in your localhost browser. An iframe `load` event cannot guarantee that every browser PDF viewer has finished painting its PDF, so verify the modal locally.

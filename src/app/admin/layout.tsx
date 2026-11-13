// Admin login must be accessible before authentication.
// Access to the dashboard and admin APIs is checked separately.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

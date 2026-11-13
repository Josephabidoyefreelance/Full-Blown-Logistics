// Public customer routes (login, signup) must not inherit the ERP dashboard shell.
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

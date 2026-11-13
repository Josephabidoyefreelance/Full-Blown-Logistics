"use client";

export default function CopyProfileLink({ employeeId }: { employeeId: string }) {
  async function copyLink() {
    const url = `${window.location.origin}/employee-of-the-year/${employeeId}`;
    try {
      await navigator.clipboard.writeText(url);
      window.dispatchEvent(new CustomEvent("jaad-toast", { detail: { message: "Employee profile link copied." } }));
    } catch {
      window.prompt("Copy employee profile link:", url);
    }
  }
  return <button type="button" className="text-xs text-neutral-500 hover:text-neutral-900" onClick={copyLink}>Copy link</button>;
}

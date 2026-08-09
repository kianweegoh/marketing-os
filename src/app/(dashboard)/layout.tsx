import { Sidebar } from '@/components/layout/Sidebar';

/** Dashboard shell: fixed-height sidebar (Section 14) beside a scrollable content column. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-page">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-5xl px-6 py-10">{children}</div>
      </main>
    </div>
  );
}

import SettingsSidebar from '@/components/settings/SettingsSidebar';

export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#191a18] text-white">
      <SettingsSidebar />
      <main className="min-w-0 flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl p-5 sm:p-7 lg:p-8">{children}</div>
      </main>
    </div>
  );
}

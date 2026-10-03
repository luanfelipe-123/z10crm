import SettingsSidebar from '@/components/settings/SettingsSidebar';
export default function ConfiguracoesLayout({ children }: { children: React.ReactNode }) { return <div className="settings-shell"><SettingsSidebar/><main className="settings-main"><div className="settings-container">{children}</div></main></div>; }

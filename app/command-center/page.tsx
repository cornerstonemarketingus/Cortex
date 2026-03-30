import CommandCenterLayout from '@/components/commandcenter/CommandCenterLayout';
import SandboxTwoPanel from '@/components/sandbox/SandboxTwoPanel';

export const metadata = { title: 'Command Center' };

export default function CommandCenterPage() {
  return (
    <CommandCenterLayout>
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Overview</h2>
        <p className="text-sm text-slate-300">Recent Copilot actions and live previews.</p>

        <div className="mt-6">
          <SandboxTwoPanel />
        </div>
      </div>
    </CommandCenterLayout>
  );
}

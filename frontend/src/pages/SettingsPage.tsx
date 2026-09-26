import { Info } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="card p-6">
        <div className="flex items-start gap-3 mb-6">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-600">
            Additional settings including notification preferences, appearance customization, and learning preferences will be available in a future version.
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900 text-sm">Dark Mode</p>
              <p className="text-xs text-gray-400">Coming soon</p>
            </div>
            <div className="w-10 h-5 bg-gray-100 rounded-full" />
          </div>
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <div>
              <p className="font-medium text-gray-900 text-sm">Email Notifications</p>
              <p className="text-xs text-gray-400">Coming soon</p>
            </div>
            <div className="w-10 h-5 bg-gray-100 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

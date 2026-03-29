export default function SLA() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="display-sm text-on-surface">SLA Rules</h1>
        <button className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700">
          Add SLA Rule
        </button>
      </div>
      <div className="bg-surface-container-lowest rounded-[1rem] p-6">
        <p className="text-on-surface-variant">SLA rules list will be displayed here</p>
      </div>
    </div>
  );
}

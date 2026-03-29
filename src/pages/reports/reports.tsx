export default function Reports() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="display-sm text-on-surface">Reports Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-surface-container-lowest rounded-[1rem] p-6">
          <h3 className="text-lg font-semibold text-on-surface mb-2">Total Tickets</h3>
          <p className="text-3xl font-bold text-brand-500">0</p>
        </div>
        <div className="bg-surface-container-lowest rounded-[1rem] p-6">
          <h3 className="text-lg font-semibold text-on-surface mb-2">Avg Resolution Time</h3>
          <p className="text-3xl font-bold text-green-600">0h</p>
        </div>
        <div className="bg-surface-container-lowest rounded-[1rem] p-6">
          <h3 className="text-lg font-semibold text-on-surface mb-2">SLA Compliance</h3>
          <p className="text-3xl font-bold text-accent-orange-600">0%</p>
        </div>
        <div className="bg-surface-container-lowest rounded-[1rem] p-6">
          <h3 className="text-lg font-semibold text-on-surface mb-2">Customer Satisfaction</h3>
          <p className="text-3xl font-bold text-yellow-600">0/5</p>
        </div>
      </div>
      <div className="bg-surface-container-lowest rounded-[1rem] p-6">
        <h2 className="text-xl font-semibold text-on-surface mb-4">Quick Reports</h2>
        <p className="text-on-surface-variant">Report links and charts will be here</p>
      </div>
    </div>
  );
}

export default function MemberDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Assigned to Me</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">In Progress</h3>
          <p className="text-3xl font-bold text-orange-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Resolved Today</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">My Active Tickets</h2>
        <p className="text-gray-600">Assigned tickets will be here</p>
      </div>
    </div>
  );
}

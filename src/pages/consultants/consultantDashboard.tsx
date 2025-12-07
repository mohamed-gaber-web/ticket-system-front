export default function ConsultantDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Consultant Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Unassigned Tickets</h3>
          <p className="text-3xl font-bold text-red-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">SLA Breaches</h3>
          <p className="text-3xl font-bold text-orange-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Total Assigned</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Unassigned Tickets Queue</h2>
        <p className="text-gray-600">Ticket assignment interface will be here</p>
      </div>
    </div>
  );
}

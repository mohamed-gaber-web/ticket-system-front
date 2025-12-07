export default function ViewTeam() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Team Details</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Team Information</h2>
          <p className="text-gray-600">Team details will be here</p>
        </div>
        <div className="border-t pt-4">
          <h2 className="text-xl font-semibold mb-4">Team Members</h2>
          <p className="text-gray-600">List of team members will be here</p>
        </div>
        <div className="border-t pt-4">
          <h2 className="text-xl font-semibold mb-4">Assigned Tickets</h2>
          <p className="text-gray-600">Team workload and tickets will be here</p>
        </div>
      </div>
    </div>
  );
}

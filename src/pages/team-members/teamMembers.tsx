export default function TeamMembers() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Team Members</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Add Team Member
        </button>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">Team member list will be displayed here</p>
      </div>
    </div>
  );
}

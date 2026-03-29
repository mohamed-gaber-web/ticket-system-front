export default function ViewTeam() {
  return (
    <div className="p-8">
      <h1 className="display-sm text-on-surface mb-6">Team Details</h1>
      <div className="bg-surface-container-lowest rounded-[1rem] p-8 space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Team Information</h2>
          <p className="text-on-surface-variant">Team details will be here</p>
        </div>
        <div className="h-px bg-surface-container-high"></div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Team Members</h2>
          <p className="text-on-surface-variant">List of team members will be here</p>
        </div>
        <div className="h-px bg-surface-container-high"></div>
        <div>
          <h2 className="text-xl font-semibold mb-4">Assigned Tickets</h2>
          <p className="text-on-surface-variant">Team workload and tickets will be here</p>
        </div>
      </div>
    </div>
  );
}

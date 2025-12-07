export default function ViewTicket() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Ticket Details</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <p className="text-gray-600">Complete ticket details with timeline</p>
        <div className="border-t pt-4">
          <h2 className="text-xl font-semibold mb-4">Comments</h2>
          <p className="text-gray-600">Comments thread will be here</p>
        </div>
        <div className="border-t pt-4">
          <h2 className="text-xl font-semibold mb-4">Attachments</h2>
          <p className="text-gray-600">File attachments will be here</p>
        </div>
      </div>
    </div>
  );
}

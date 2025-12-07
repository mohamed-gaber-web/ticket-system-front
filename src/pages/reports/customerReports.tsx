export default function CustomerReports() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Customer Satisfaction Reports</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Average Rating</h3>
          <p className="text-3xl font-bold text-yellow-600">0/5</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Total Reviews</h3>
          <p className="text-3xl font-bold text-blue-600">0</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Satisfaction Rate</h3>
          <p className="text-3xl font-bold text-green-600">0%</p>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Customer Feedback</h2>
        <p className="text-gray-600">Customer satisfaction data and feedback will be here</p>
      </div>
    </div>
  );
}

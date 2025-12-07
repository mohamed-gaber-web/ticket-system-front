import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, UserCheck, UserX, Briefcase } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../redux/hooks/hooks';
import { fetchConsultantStats } from '../../redux/slices/consultantSlice';
import { fetchAssignmentStats } from '../../redux/slices/assignmentSlice';
import StatCard from '../../components/consultant-reports/StatCard';
import RoleDistributionChart from '../../components/consultant-reports/charts/RoleDistributionChart';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export default function ConsultantDashboard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { stats: consultantStats, statsLoading: consultantLoading } = useAppSelector(
    (state) => state.consultants
  );
  const { stats: assignmentStats, statsLoading: assignmentLoading } = useAppSelector(
    (state) => state.assignments
  );

  useEffect(() => {
    dispatch(fetchConsultantStats());
    dispatch(fetchAssignmentStats());
  }, [dispatch]);

  const isLoading = consultantLoading || assignmentLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Consultant Reports Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive consultant performance and assignment analytics
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate('/consultant-reports/list')}
          >
            View All Consultants
          </Button>
          <Button onClick={() => navigate('/consultant-reports/analytics')}>
            View Analytics
          </Button>
        </div>
      </div>

      {/* Consultant Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Consultants"
          value={consultantStats?.total || 0}
          icon={Users}
          colorClass="text-blue-600"
        />
        <StatCard
          title="Active"
          value={consultantStats?.active || 0}
          icon={UserCheck}
          colorClass="text-green-600"
        />
        <StatCard
          title="Inactive"
          value={consultantStats?.inactive || 0}
          icon={UserX}
          colorClass="text-red-600"
        />
        <StatCard
          title="On Leave"
          value={consultantStats?.onLeave || 0}
          icon={Briefcase}
          colorClass="text-yellow-600"
        />
      </div>

      {/* Charts and Assignment Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Distribution Chart */}
        <RoleDistributionChart data={consultantStats?.byRole || []} />

        {/* Assignment Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-600 uppercase">Total Assignments</p>
                <h3 className="text-2xl font-bold text-blue-900 mt-2">
                  {assignmentStats?.total || 0}
                </h3>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-600 uppercase">Current</p>
                <h3 className="text-2xl font-bold text-purple-900 mt-2">
                  {assignmentStats?.current || 0}
                </h3>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-600 uppercase">Accepted</p>
                <h3 className="text-2xl font-bold text-green-900 mt-2">
                  {assignmentStats?.accepted || 0}
                </h3>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-600 uppercase">Pending</p>
                <h3 className="text-2xl font-bold text-yellow-900 mt-2">
                  {assignmentStats?.pendingAcceptance || 0}
                </h3>
              </div>
            </div>

            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/consultant-reports/analytics')}
              >
                View Detailed Analytics
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Consultants Summary */}
      {assignmentStats?.byConsultant && assignmentStats.byConsultant.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Top Consultants by Assignments</CardTitle>
              <Button
                variant="link"
                onClick={() => navigate('/consultant-reports/analytics')}
              >
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignmentStats.byConsultant.slice(0, 5).map((consultant, index) => {
                const total = assignmentStats.total;
                const percentage = total > 0 ? (consultant.count / total) * 100 : 0;

                return (
                  <div key={consultant._id} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-900">
                          {consultant.consultantName}
                        </span>
                        <span className="text-sm text-gray-600">
                          {consultant.count} assignments
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

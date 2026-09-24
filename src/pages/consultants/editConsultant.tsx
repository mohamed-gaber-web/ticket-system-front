import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { fetchConsultantById, updateConsultant, clearCurrentConsultant } from '@/redux/slices/consultantSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { UpdateConsultantData } from '@/types/consultant.types';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { employeeToForm } from '@/components/employees/employeeFormModel';
import { EMPLOYEES_PATH } from '@/lib/hr';

export default function EditEmployee() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentConsultant, loading } = useAppSelector((state) => state.consultants);
  const { departments } = useAppSelector((state) => state.departments);

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
    if (id) dispatch(fetchConsultantById(id));
    return () => {
      dispatch(clearCurrentConsultant());
    };
  }, [id, dispatch]);

  // Only the record for this route — never a stale one from a previous page
  const employee = currentConsultant && currentConsultant._id === id ? currentConsultant : null;
  const initialValues = useMemo(() => (employee ? employeeToForm(employee) : null), [employee]);

  const handleSubmit = async (payload: UpdateConsultantData) => {
    if (!id) return;
    const result = await dispatch(updateConsultant({ id, data: payload }));
    if (updateConsultant.fulfilled.match(result)) navigate(EMPLOYEES_PATH);
  };

  if (!initialValues) {
    if (loading) {
      return (
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          </div>
        </div>
      );
    }
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-on-surface-variant">Employee not found</p>
          <Button onClick={() => navigate(EMPLOYEES_PATH)} className="mt-4">
            Back to Employees
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(EMPLOYEES_PATH)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="display-sm text-on-surface">Edit Employee</h1>
          <p className="text-on-surface-variant mt-1">
            {employee?.fullName}
            {employee?.employeeCode ? ` · ${employee.employeeCode}` : ''}
          </p>
        </div>
      </div>

      <EmployeeForm
        key={employee?._id}
        mode="edit"
        initialValues={initialValues}
        departments={departments}
        submitting={loading}
        employeeId={id}
        onSubmit={handleSubmit}
        onCancel={() => navigate(EMPLOYEES_PATH)}
      />
    </div>
  );
}

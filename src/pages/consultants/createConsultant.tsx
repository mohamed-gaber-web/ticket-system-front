import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/redux/hooks/hooks';
import { createConsultant } from '@/redux/slices/consultantSlice';
import { fetchDepartments } from '@/redux/slices/departmentSlice';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { CreateConsultantData, UpdateConsultantData } from '@/types/consultant.types';
import type { EmployeeRole } from '@/types/auth.types';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { emptyEmployeeForm } from '@/components/employees/employeeFormModel';
import { useAccess } from '@/redux/hooks/useAccess';
import type { StagedDocumentUpload } from '@/components/employees/EmployeeDocuments';
import { uploadEmployeeDocuments } from '@/api/consultantApi';
import { toast } from 'sonner';
import { EMPLOYEES_PATH, employeeViewPath } from '@/lib/hr';

export default function CreateEmployee() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.consultants);
  const { departments } = useAppSelector((state) => state.departments);
  const access = useAccess();

  useEffect(() => {
    dispatch(fetchDepartments({ isActive: true, limit: 999 } as any));
  }, [dispatch]);

  // A manager only ever mints the plain role of their own family, which is
  // also the form's starting point; admins and HR start from "consultant".
  const initialValues = useMemo(
    () =>
      emptyEmployeeForm(
        access.isAdmin || access.isHr ? 'consultant' : ((access.family ?? 'consultant') as EmployeeRole),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleSubmit = async (payload: CreateConsultantData | UpdateConsultantData, documents: StagedDocumentUpload[]) => {
    const result = await dispatch(createConsultant(payload as CreateConsultantData));
    if (!createConsultant.fulfilled.match(result)) return;
    const newId = result.payload?.data?._id;
    if (newId && documents.length) {
      // The employee exists now — upload what was chosen on the form. A failed
      // batch does not undo the employee; HR can retry from the profile.
      const failed: string[] = [];
      for (const d of documents) {
        try {
          await uploadEmployeeDocuments(newId, { type: d.type, files: d.files, expiryDate: d.expiryDate, notes: d.notes });
        } catch (error: any) {
          failed.push(error.response?.data?.message || d.files.map((f) => f.name).join(', '));
        }
      }
      if (failed.length) toast.error(`Some documents were not uploaded: ${failed.join('; ')}`);
      else toast.success('Documents uploaded');
      navigate(employeeViewPath(newId));
      return;
    }
    navigate(EMPLOYEES_PATH);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate(EMPLOYEES_PATH)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="display-sm text-on-surface">New Employee</h1>
          <p className="text-on-surface-variant mt-1">Add an employee file and their system account</p>
        </div>
      </div>

      <EmployeeForm
        mode="create"
        initialValues={initialValues}
        departments={departments}
        submitting={loading}
        onSubmit={handleSubmit}
        onCancel={() => navigate(EMPLOYEES_PATH)}
      />
    </div>
  );
}

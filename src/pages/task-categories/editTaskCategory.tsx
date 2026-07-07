import { useAppDispatch, useAppSelector } from "@/redux/hooks/hooks";
import { fetchTaskCategoryById, updateTaskCategory } from "@/redux/slices/taskCategorySlice";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TaskCategoryForm from "./components/TaskCategoryForm";
import type { UpdateTaskCategoryData } from "@/types/taskCategory";

export default function EditTaskCategory() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { currentTaskCategory, loading } = useAppSelector((state) => state.taskCategories);

  useEffect(() => {
    if (id) {
      dispatch(fetchTaskCategoryById(id));
    }
  }, [id, dispatch]);

  const handleSubmit = async (data: UpdateTaskCategoryData) => {
    if (!id) return;

    try {
      await dispatch(updateTaskCategory({ id, data })).unwrap();
      navigate("/task-categories");
    } catch {
      // Error toast handled in the slice.
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-on-surface-variant">Loading task category...</p>
      </div>
    );
  }

  if (!currentTaskCategory) {
    return (
      <div className="p-8">
        <p className="text-error">Task category not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-md font-bold mb-6">Edit Task Category</h1>
      <TaskCategoryForm initialData={currentTaskCategory} onSubmit={handleSubmit} isEdit={true} />
    </div>
  );
}

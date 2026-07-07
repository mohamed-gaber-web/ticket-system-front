import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/redux/hooks/hooks";
import TaskCategoryForm from "./components/TaskCategoryForm";
import type { CreateTaskCategoryData, UpdateTaskCategoryData } from "@/types/taskCategory";
import { createTaskCategory } from "@/redux/slices/taskCategorySlice";

export default function CreateTaskCategory() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = (data: CreateTaskCategoryData | UpdateTaskCategoryData) => {
    dispatch(createTaskCategory(data as CreateTaskCategoryData)).unwrap()
      .then(() => {
        navigate("/task-categories");
      })
      .catch(() => {
        // Error toast handled in the slice.
      });
  };

  return (
    <div className="p-8">
      <h1 className="text-md font-bold mb-6">Create New Task Category</h1>
      <TaskCategoryForm onSubmit={handleSubmit} />
    </div>
  );
}

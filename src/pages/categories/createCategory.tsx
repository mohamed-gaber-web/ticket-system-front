import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/redux/hooks/hooks";
import CategoryForm from "./components/CategoryForm";
import type { CreateCategoryData, UpdateCategoryData } from "@/types/category";
import { createCategory } from "@/redux/slices/categorySlice";

export default function CreateCategory() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = (data: CreateCategoryData | UpdateCategoryData) => {
    dispatch(createCategory(data as CreateCategoryData)).unwrap()
      .then(() => {
        navigate("/categories");
      })
      .catch((error) => {
        console.error("Failed to create category:", error);
      });
  };

  return (
    <div className="p-8">
      <h1 className="text-md font-bold mb-6">Create New Category</h1>
      <CategoryForm onSubmit={handleSubmit} />
    </div>
  );
}

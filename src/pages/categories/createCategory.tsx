import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "@/redux/hooks/hooks";
import CategoryForm from "./components/CategoryForm";
import type { CreateCategoryData, UpdateCategoryData } from "@/types/category";
import { createCategory } from "@/redux/slices/categorySlice";

export default function CreateCategory() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleSubmit = (data: CreateCategoryData | UpdateCategoryData) => {
    console.log('Submitting category data:', data);
    dispatch(createCategory(data as CreateCategoryData)).unwrap()
      .then((result) => {
        console.log('Category created successfully:', result);
        console.log('Navigating to /categories');

        // Use setTimeout to ensure state updates are complete before navigation
        setTimeout(() => {
          navigate("/categories");
        }, 100);
      })
      .catch((error) => {
        console.error("Failed to create category:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
      });
  };

  return (
    <div className="p-6">
      <h1 className="text-md font-bold mb-6">Create New Category</h1>
      <CategoryForm onSubmit={handleSubmit} />
    </div>
  );
}

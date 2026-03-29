import { useAppDispatch, useAppSelector } from "@/redux/hooks/hooks";
import { fetchCategoryById, updateCategory } from "@/redux/slices/categorySlice";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CategoryForm from "./components/CategoryForm";
import type { UpdateCategoryData } from "@/types/category";

export default function EditCategory() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { currentCategory, loading } = useAppSelector((state) => state.categories);

  useEffect(() => {
    if (id) {
      dispatch(fetchCategoryById(id));
    }
  }, [id, dispatch]);

  const handleSubmit = async (data: UpdateCategoryData) => {
    if (!id) return;

    try {
      await dispatch(updateCategory({ id, data })).unwrap();
      navigate("/categories");
    } catch (error) {
      console.error("Failed to update category:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-on-surface-variant">Loading category...</p>
      </div>
    );
  }

  if (!currentCategory) {
    return (
      <div className="p-8">
        <p className="text-error">Category not found</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-md font-bold mb-6">Edit Category</h1>
      <CategoryForm initialData={currentCategory} onSubmit={handleSubmit} isEdit={true} />
    </div>
  );
}

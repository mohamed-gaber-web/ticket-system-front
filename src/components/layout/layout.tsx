// src/components/layout/Layout.tsx
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header/Header";
import Sidebar from "./Sidebar/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useAppDispatch, useAppSelector } from "@/redux/hooks/hooks";
import { getProfile } from "@/redux/slices/authSlice";

export default function Layout() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  // Fetch user profile if authenticated but user data is missing
  useEffect(() => {
    if (isAuthenticated && !user) {
      console.log('User authenticated but data missing, fetching profile...');
      dispatch(getProfile());
    }
  }, [isAuthenticated, user, dispatch]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50">
          <Outlet />
          <Toaster position="top-right" />
        </main>
      </div>
    </div>
  );
}

import { configureStore } from '@reduxjs/toolkit';
import customerReducer from './slices/customerSlice';
import authReducer from './slices/authSlice';
import ticketReducer from './slices/ticketSlice';
import categoryReducer from './slices/categorySlice';
import consultantReducer from './slices/consultantSlice';
import assignmentReducer from './slices/assignmentSlice';

export const store = configureStore({
  reducer: {
    customers: customerReducer,
    auth: authReducer,
    tickets: ticketReducer,
    categories: categoryReducer,
    consultants: consultantReducer,
    assignments: assignmentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

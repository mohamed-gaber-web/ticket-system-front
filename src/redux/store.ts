import { configureStore } from '@reduxjs/toolkit';
import customerReducer from './slices/customerSlice';
import authReducer from './slices/authSlice';
import ticketReducer from './slices/ticketSlice';
import categoryReducer from './slices/categorySlice';
import consultantReducer from './slices/consultantSlice';
import assignmentReducer from './slices/assignmentSlice';
import teamReducer from './slices/teamSlice';
import teamMemberReducer from './slices/teamMemberSlice';
import notificationReducer from './slices/notificationSlice';
import attachmentReducer from './slices/attachmentSlice';

export const store = configureStore({
  reducer: {
    customers: customerReducer,
    auth: authReducer,
    tickets: ticketReducer,
    categories: categoryReducer,
    consultants: consultantReducer,
    assignments: assignmentReducer,
    teams: teamReducer,
    teamMembers: teamMemberReducer,
    notifications: notificationReducer,
    attachments: attachmentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

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
import commentReducer from './slices/commentSlice';
import environmentReducer from './slices/environmentSlice';
import featureReducer from './slices/featureSlice';
import productTypeReducer from './slices/productTypeSlice';
import scopeReducer from './slices/scopeSlice';
import serviceTypeReducer from './slices/serviceTypeSlice';
import erpTypeReducer from './slices/erpTypeSlice';
import versionNumberReducer from './slices/versionNumberSlice';
import departmentReducer from './slices/departmentSlice';
import sourceReducer from './slices/sourceSlice';

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
    comments: commentReducer,
    environments: environmentReducer,
    features: featureReducer,
    productTypes: productTypeReducer,
    scopes: scopeReducer,
    serviceTypes: serviceTypeReducer,
    erpTypes: erpTypeReducer,
    versionNumbers: versionNumberReducer,
    departments: departmentReducer,
    sources: sourceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

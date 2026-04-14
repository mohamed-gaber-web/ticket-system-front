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
import customizedSolutionReducer from './slices/customizedSolutionSlice';
import productTypeReducer from './slices/productTypeSlice';
import moduleReducer from './slices/moduleSlice';
import serviceTypeReducer from './slices/serviceTypeSlice';
import erpTypeReducer from './slices/erpTypeSlice';
import versionNumberReducer from './slices/versionNumberSlice';
import departmentReducer from './slices/departmentSlice';
import sourceReducer from './slices/sourceSlice';
import companyReducer from './slices/companySlice';
import companyUserReducer from './slices/companyUserSlice';
import workingHoursReducer from './slices/workingHoursSlice';
import teleSalesLeadsReducer from './slices/teleSalesLeadsSlice';
import teleSalesAgentsReducer from './slices/teleSalesAgentsSlice';

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
    customizedSolutions: customizedSolutionReducer,
    productTypes: productTypeReducer,
    modules: moduleReducer,
    serviceTypes: serviceTypeReducer,
    erpTypes: erpTypeReducer,
    versionNumbers: versionNumberReducer,
    departments: departmentReducer,
    sources: sourceReducer,
    companies: companyReducer,
    companyUsers: companyUserReducer,
    workingHours: workingHoursReducer,
    teleSalesLeads: teleSalesLeadsReducer,
    teleSalesAgents: teleSalesAgentsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

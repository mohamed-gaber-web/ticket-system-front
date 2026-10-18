import { configureStore } from '@reduxjs/toolkit';
import customerReducer from './slices/customerSlice';
import authReducer from './slices/authSlice';
import ticketReducer from './slices/ticketSlice';
import categoryReducer from './slices/categorySlice';
import consultantReducer from './slices/consultantSlice';
import assignmentReducer from './slices/assignmentSlice';
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
import industrySectorReducer from './slices/industrySectorSlice';
import countryReducer from './slices/countrySlice';
import businessClassificationReducer from './slices/businessClassificationSlice';
import companyReducer from './slices/companySlice';
import companyUserReducer from './slices/companyUserSlice';
import workingHoursReducer from './slices/workingHoursSlice';
import teleSalesLeadsReducer from './slices/teleSalesLeadsSlice';
import teleSalesAgentsReducer from './slices/teleSalesAgentsSlice';
import teleSalesTeamsReducer from './slices/teleSalesTeamsSlice';
import teleSalesDashboardReducer from './slices/teleSalesDashboardSlice';
import tasksReducer from './slices/tasksSlice';
import taskCategoriesReducer from './slices/taskCategorySlice';
import taskAttachmentsReducer from './slices/taskAttachmentSlice';
import taskCommentsReducer from './slices/taskCommentSlice';
import meetingsReducer from './slices/meetingSlice';
import developmentReducer from './slices/developmentSlice';
import employeeRequestsReducer from './slices/employeeRequestSlice';
import employeeBalancesReducer from './slices/employeeBalanceSlice';
import aiReducer from './slices/aiSlice';
import evaluationReducer from './slices/evaluationSlice';
import salesAssistantReducer from './slices/salesAssistantSlice';
import proposalBuilderReducer from './slices/proposalBuilderSlice';
import ticketSettingsReducer from './slices/ticketSettingsSlice';
import myHomeReducer from './slices/myHomeSlice';
import vaultLookupsReducer from './slices/vaultLookupsSlice';
import vaultEntriesReducer from './slices/vaultEntriesSlice';
import vaultSendReducer from './slices/vaultSendSlice';
import vaultReportsReducer from './slices/vaultReportsSlice';
import socialReducer from './slices/socialSlice';

export const store = configureStore({
  reducer: {
    customers: customerReducer,
    auth: authReducer,
    tickets: ticketReducer,
    categories: categoryReducer,
    consultants: consultantReducer,
    assignments: assignmentReducer,
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
    industrySectors: industrySectorReducer,
    countries: countryReducer,
    businessClassifications: businessClassificationReducer,
    companies: companyReducer,
    companyUsers: companyUserReducer,
    workingHours: workingHoursReducer,
    teleSalesLeads: teleSalesLeadsReducer,
    teleSalesAgents: teleSalesAgentsReducer,
    teleSalesTeams: teleSalesTeamsReducer,
    teleSalesDashboard: teleSalesDashboardReducer,
    tasks: tasksReducer,
    taskCategories: taskCategoriesReducer,
    taskAttachments: taskAttachmentsReducer,
    taskComments: taskCommentsReducer,
    meetings: meetingsReducer,
    development: developmentReducer,
    employeeRequests: employeeRequestsReducer,
    employeeBalances: employeeBalancesReducer,
    ai: aiReducer,
    evaluation: evaluationReducer,
    salesAssistant: salesAssistantReducer,
    proposalBuilder: proposalBuilderReducer,
    ticketSettings: ticketSettingsReducer,
    myHome: myHomeReducer,
    vaultLookups: vaultLookupsReducer,
    vaultEntries: vaultEntriesReducer,
    vaultSend: vaultSendReducer,
    vaultReports: vaultReportsReducer,
    social: socialReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

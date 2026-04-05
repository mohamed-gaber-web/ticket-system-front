import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { Toaster } from 'sonner';
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
    <Toaster position="top-right" richColors />
  </Provider>,
)

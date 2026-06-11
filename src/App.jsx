import AppRoutes from "./routes/AppRoutes";
import AppAlertProvider from "./components/common/AppAlertProvider";

function App() {
  return (
    <AppAlertProvider>
      <AppRoutes />
    </AppAlertProvider>
  );
}

export default App;
